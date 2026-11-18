import { NS } from './config';
import { nameKey } from './names';
import type { AnswerKey, QuestionId } from './questions';
import { emptySlide, type AudienceQuestion, type Feedback, type TejedorData, type Player, type Reaction, type Realtime, type SlideState, type VoteRecord, type Votes } from './realtime';

interface LocalDb {
  slide: SlideState;
  players: Record<string, string>;
  /** uid → epoch ms de la primera entrada */
  joinedAt: Record<string, number>;
  /** nameKey → uid */
  names: Record<string, string>;
  votes: Record<string, VoteRecord>;
  tejedores: Record<string, TejedorData>;
  questions: Record<string, AudienceQuestion>;
  feedback: Record<string, Feedback>;
  answers: AnswerKey | null;
}

const KEY = `${NS}.local.db`;
const empty = (): LocalDb => ({ slide: emptySlide(), players: {}, joinedAt: {}, names: {}, votes: {}, tejedores: {}, questions: {}, feedback: {}, answers: null });

function read(): LocalDb {
  try {
    const db = { ...empty(), ...JSON.parse(localStorage.getItem(KEY) || '{}') } as LocalDb;
    db.slide = { ...emptySlide(), ...db.slide };
    return db;
  } catch {
    return empty();
  }
}

/** Modo ensayo: sin red. Cada pestaña es un asistente distinto. */
export function createLocalRealtime(): Realtime {
  const channel = new BroadcastChannel(`${NS}-live`);
  const listeners = new Set<(db: LocalDb) => void>();
  const reactionListeners = new Set<(r: Reaction, uid: string) => void>();

  let uid: string | null;
  try {
    uid = sessionStorage.getItem(`${NS}.uid`);
    if (!uid) sessionStorage.setItem(`${NS}.uid`, (uid = 'local-' + crypto.randomUUID().slice(0, 8)));
  } catch {
    uid = 'local-' + Math.random().toString(36).slice(2, 10);
  }
  const me = uid;

  // La copia más reciente que conocemos. Entre pestañas, localStorage se sincroniza de forma
  // ASÍNCRONA: el aviso del BroadcastChannel puede llegar antes que el dato. Por eso el aviso
  // lleva la base completa y quien lo recibe la usa (no relee localStorage).
  let latest: LocalDb | null = null;
  const current = () => latest ?? read();
  const emit = (db: LocalDb = current()) => {
    listeners.forEach((l) => l(db));
  };
  const write = (fn: (db: LocalDb) => void) => {
    const db = current();
    fn(db);
    latest = db;
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
    } catch {
      /* cuota llena */
    }
    channel.postMessage({ type: 'db', db });
    emit(db);
  };
  channel.onmessage = (e) => {
    if (e.data?.type === 'db') {
      if (e.data.db) latest = { ...empty(), ...e.data.db, slide: { ...emptySlide(), ...e.data.db.slide } };
      else latest = null; // aviso sin datos (p. ej. ensayos que escriben localStorage a mano): releer
      emit();
    }
    if (e.data?.type === 'reaction') reactionListeners.forEach((l) => l(e.data.r, e.data.uid));
  };
  const sub = (fn: (db: LocalDb) => void) => {
    listeners.add(fn);
    queueMicrotask(() => fn(current()));
    return () => {
      listeners.delete(fn);
    };
  };
  // En ensayo local "presentadora" = quien abre el deck con ?presenter.
  const isPresenter = () => new URLSearchParams(location.search).has('presenter');

  return {
    mode: 'local',
    uid: () => me,

    async patchSlide(s) {
      write((db) => (db.slide = { ...db.slide, ...s }));
    },
    async openQuestion(q: QuestionId) {
      write((db) => (db.slide.openedAt = { ...db.slide.openedAt, [q]: Date.now() }));
    },
    async markEarlyEnd() {
      write((db) => (db.slide.earlyUntil ??= Date.now()));
    },
    onSlide: (cb) => sub((db) => cb(db.slide)),

    async reserveName(name) {
      const k = nameKey(name);
      let ok = false;
      write((db) => {
        const owner = db.names[k];
        if (!owner || owner === me) {
          db.names[k] = me;
          ok = true;
        }
      });
      return ok;
    },
    async takenNames(names) {
      const db = current();
      return new Set(names.filter((n) => db.names[nameKey(n)] && db.names[nameKey(n)] !== me));
    },
    async join(name) {
      write((db) => {
        db.players[me] = name;
        db.joinedAt ??= {};
        db.joinedAt[me] ??= Date.now();
      });
    },
    async vote(q, option) {
      write((db) => {
        const rec = db.votes[me] ?? { uid: me, votes: {}, at: {} };
        if (rec.votes[q]) return; // una respuesta por pregunta
        rec.votes[q] = option;
        rec.at[q] = Date.now();
        db.votes[me] = rec;
      });
    },
    onMyVotes: (cb) => sub((db) => cb((db.votes[me]?.votes ?? {}) as Votes)),
    async react(r) {
      channel.postMessage({ type: 'reaction', r, uid: me });
      reactionListeners.forEach((l) => l(r, me));
    },
    async ask(q) {
      const id = crypto.randomUUID().slice(0, 8);
      write((db) => (db.questions[id] = { ...q, id, uid: me, at: Date.now() }));
    },
    async markLost(slideId) {
      write((db) => {
        const f = (db.feedback[me] ??= { uid: me, lost: [] });
        if (!f.lost.includes(slideId)) f.lost.push(slideId);
      });
    },
    async rate(r) {
      write((db) => Object.assign((db.feedback[me] ??= { uid: me, lost: [] }), r));
    },
    async publishTejedor(d) {
      write((db) => (db.tejedores[me] = { ...d, id: me, createdAt: db.tejedores[me]?.createdAt ?? Date.now(), hidden: db.tejedores[me]?.hidden ?? false }));
    },

    onPlayers: (cb) => sub((db) => cb(Object.entries(db.players).map(([id, name]): Player => ({ id, name, at: db.joinedAt?.[id] })))),
    onVotes: (cb) => sub((db) => cb(Object.values(db.votes))),
    onReaction(cb) {
      reactionListeners.add(cb);
      return () => {
        reactionListeners.delete(cb);
      };
    },
    onTejedores: (cb) => sub((db) => cb(Object.values(db.tejedores).sort((a, b) => b.createdAt - a.createdAt))),
    onQuestions: (cb) => sub((db) => cb(Object.values(db.questions).sort((a, b) => a.at - b.at))),
    onFeedback: (cb) => sub((db) => cb(Object.values(db.feedback))),
    async removeQuestion(id) {
      write((db) => delete db.questions[id]);
    },
    async setTejedorHidden(id, hidden) {
      write((db) => {
        if (db.tejedores[id]) db.tejedores[id].hidden = hidden;
      });
    },
    async resetSession() {
      const db = current();
      const n = Object.keys(db.players).length + Object.keys(db.tejedores).length + Object.keys(db.questions).length + Object.keys(db.votes).length;
      write((d) => Object.assign(d, { ...empty(), answers: d.answers }));
      return n;
    },

    async loadAnswers() {
      return isPresenter() ? current().answers : null;
    },
    async saveAnswers(a) {
      write((db) => (db.answers = a));
    },

    async signInPresenter() {
      return true;
    },
    isPresenterSession: isPresenter,
  };
}
