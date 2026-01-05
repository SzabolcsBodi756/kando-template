import React, { useEffect, useRef, useState } from "react";
import "./App.css";

const MAX_KERDES = 20;

/** Fisher–Yates shuffle */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * TXT -> kérdés tömb parser
 * Elfogad:
 * 1) JSON tömb: [ { "kerdes": "...", "valaszok": [...], "helyes": 2 }, ... ]
 * 2) JS-szerű: const kerdesek = [ {...}, ... ];
 */
function parseKerdesekFromText(text) {
  const t = String(text || "").trim();
  if (!t) throw new Error("Üres fájl.");

  // JSON tömb
  if (t.startsWith("[")) {
    const data = JSON.parse(t);
    validateKerdesek(data);
    return data;
  }

  // JS-szerű: kivágjuk a [...] részt
  const start = t.indexOf("[");
  const end = t.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Nem található tömb formátum a fájlban.");
  }
  const arrText = t.slice(start, end + 1);

  // Kulcsok idézőjelezése JSON-hoz (csak a 3 kulcsot kezeljük)
  const jsonLike = arrText
    .replace(/(\{|,)\s*(kerdes)\s*:/g, '$1 "$2":')
    .replace(/(\{|,)\s*(valaszok)\s*:/g, '$1 "$2":')
    .replace(/(\{|,)\s*(helyes)\s*:/g, '$1 "$2":');

  const data = JSON.parse(jsonLike);
  validateKerdesek(data);
  return data;
}

function validateKerdesek(data) {
  if (!Array.isArray(data)) throw new Error("A fájl nem tömböt tartalmaz.");

  const isInt = (x) => Number.isInteger(x);

  data.forEach((q, i) => {
    if (!q || typeof q !== "object") throw new Error(`Hibás elem a tömbben: #${i + 1}`);
    if (typeof q.kerdes !== "string") throw new Error(`Hiányzó/hibás 'kerdes' a(z) #${i + 1}. elemnél`);
    if (!Array.isArray(q.valaszok) || q.valaszok.some((v) => typeof v !== "string")) {
      throw new Error(`Hiányzó/hibás 'valaszok' a(z) #${i + 1}. elemnél`);
    }

    const helyes = q.helyes;

    // helyes lehet number vagy number[]
    if (isInt(helyes)) {
      if (helyes < 0 || helyes >= q.valaszok.length) {
        throw new Error(`A 'helyes' index kívül esik a válaszok tartományán a(z) #${i + 1}. elemnél`);
      }
    } else if (Array.isArray(helyes)) {
      if (helyes.length === 0 || helyes.some((x) => !isInt(x))) {
        throw new Error(`Hiányzó/hibás 'helyes' tömb a(z) #${i + 1}. elemnél`);
      }
      if (helyes.some((x) => x < 0 || x >= q.valaszok.length)) {
        throw new Error(`A 'helyes' tömbben van rossz index a(z) #${i + 1}. elemnél`);
      }
      const uniq = new Set(helyes);
      if (uniq.size !== helyes.length) {
        throw new Error(`A 'helyes' tömb duplikált indexet tartalmaz a(z) #${i + 1}. elemnél`);
      }
    } else {
      throw new Error(`Hiányzó/hibás 'helyes' a(z) #${i + 1}. elemnél`);
    }
  });
}

/**
 * Készít quiz-t:
 * - kérdések keverése + limit
 * - válaszok keverése
 * - multi helyes támogatás Set-tel
 */
function buildQuiz(allQuestions, max) {
  const picked = shuffle(allQuestions).slice(0, Math.min(max, allQuestions.length));

  return picked.map((q, qi) => {
    const correctSet = new Set(Array.isArray(q.helyes) ? q.helyes : [q.helyes]);

    const answersRaw = q.valaszok.map((txt, idx) => ({
      answerId: `${qi}-${idx}`, // stabil
      szoveg: txt,
      originalIndex: idx,
      helyes: correctSet.has(idx),
    }));

    const answersShuffled = shuffle(answersRaw);

    return {
      kerdes: q.kerdes,
      helyesSet: correctSet, // Set<number>
      answers: answersShuffled,
    };
  });
}

function isSetEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

export default function App() {
  const [kerdesek, setKerdesek] = useState(null); // betöltött raw kérdések


  // Quiz
  const [quiz, setQuiz] = useState([]);
  const [index, setIndex] = useState(0);
  const [pont, setPont] = useState(0);

  // userAnswers[i] = { selectedOriginalIndices: number[] }
  const [userAnswers, setUserAnswers] = useState([]);

  // lock a véglegesítés alatt
  const [locked, setLocked] = useState(false);

  // multi kijelölések az aktuális kérdéshez
  const [selectedSet, setSelectedSet] = useState(() => new Set());

  const timerRef = useRef(null);

  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function initWithQuestions(qs) {
    const qz = buildQuiz(qs, MAX_KERDES);
    setQuiz(qz);
    setIndex(0);
    setPont(0);
    setUserAnswers(Array(qz.length).fill(null));
    setLocked(false);
    setSelectedSet(new Set());
  }

  // Automatikus betöltés: public/kerdesek.txt
  useEffect(() => {
  (async () => {
    const resp = await fetch("/kerdesek.txt", { cache: "no-store" });
    if (!resp.ok) {
      console.error("Nem található a public/kerdesek.txt");
      return;
    }
    const text = await resp.text();
    const parsed = parseKerdesekFromText(text);
    setKerdesek(parsed);
    initWithQuestions(parsed);
  })();
}, []);


  const total = quiz.length;
  const finished = total > 0 && index >= total;
  const current = !finished && total > 0 ? quiz[index] : null;
  const selectedForCurrent = !finished && total > 0 ? userAnswers[index] : null;

  const percent = finished ? Math.round((pont / total) * 100) : 0;

  const isMulti = !!current && current.helyesSet.size > 1;

  function finalizeWithChosenSet(chosenSet) {
    if (!current || finished || locked) return;

    clearTimer();
    setLocked(true);

    const correct = current.helyesSet;
    const ok = isSetEqual(chosenSet, correct);

    setUserAnswers((prev) => {
      const next = [...prev];
      next[index] = { selectedOriginalIndices: [...chosenSet] };
      return next;
    });

    if (ok) setPont((p) => p + 1);

    window.setTimeout(() => {
      setIndex((i) => i + 1);
      setLocked(false);
      setSelectedSet(new Set());
    }, 600);
  }

  function handleAnswerClick(answer) {
    if (!current || finished) return;
    if (locked) return;
    if (selectedForCurrent) return;

    if (!isMulti) {
      // single: azonnal véglegesítjük
      finalizeWithChosenSet(new Set([answer.originalIndex]));
      return;
    }

    // multi: toggle
    setSelectedSet((prev) => {
      const next = new Set(prev);
      if (next.has(answer.originalIndex)) next.delete(answer.originalIndex);
      else next.add(answer.originalIndex);
      return next;
    });
  }

  function finalizeMulti() {
    if (!current || finished || locked) return;
    if (selectedForCurrent) return;
    if (selectedSet.size === 0) return;

    finalizeWithChosenSet(new Set(selectedSet));
  }

  function restart() {
    clearTimer();
    if (kerdesek) initWithQuestions(kerdesek);
  }

  

  // Színezés logika (kérdés közben):
  // - single: kattintás után (selectedForCurrent) zöld/piros + helyes zöld
  // - multi: kijelöléskor "selected" stílus, véglegesítés után zöld/piros + helyes zöld
  function getAnswerClassDuringQuiz(a) {
    let cls = "answer";

    const isSelectedNow = isMulti ? selectedSet.has(a.originalIndex) : false;

    if (!selectedForCurrent) {
      if (isMulti && isSelectedNow) cls += " selected";
      return cls;
    }

    // már véglegesített
    const picked = new Set(selectedForCurrent.selectedOriginalIndices || []);
    const userOk = isSetEqual(picked, current.helyesSet);
    const isUserPick = picked.has(a.originalIndex);
    const isCorrect = current.helyesSet.has(a.originalIndex);

    if (isCorrect) cls += " correct";
    if (isUserPick && !isCorrect) cls += " wrong";
    if (userOk && isUserPick && isCorrect) cls += " okPulse";

    return cls;
  }

  return (
    <div className="page">
      <div className="content">
      <h1>Osztályozó feladatsor</h1>

      {quiz.length === 0 ? (
        <div className="hint" style={{ marginTop: 16 }}>
          Nincs betöltött kérdéslista. Tedd a fájlt a <code>public/kerdesek.txt</code>-be,
          vagy töltsd be a fenti gombbal.
        </div>
      ) : !finished ? (
        <>
          <p className="counter">
            Kérdés {index + 1} / {total}
          </p>

          <h2 className="question">{current.kerdes}</h2>

          {isMulti && (
            <div className="multiHint">
              Több helyes válasz is lehet. Jelölj be többet, majd nyomd meg a <b>Véglegesítés</b> gombot.
            </div>
          )}

          <div className="answers">
            {current.answers.map((a) => (
              <button
                key={a.answerId}
                type="button"
                className={getAnswerClassDuringQuiz(a)}
                onClick={() => handleAnswerClick(a)}
                disabled={locked || !!selectedForCurrent}
              >
                {a.szoveg}
              </button>
            ))}
          </div>

          {isMulti && !selectedForCurrent && (
            <button
              className="btn finalize"
              onClick={finalizeMulti}
              disabled={locked || selectedSet.size === 0}
            >
              Véglegesítés / Következő
            </button>
          )}
        </>
      ) : (
        <>
          <h2>Kész 🎉</h2>
          <h3>
            Eredmény: {pont} / {total} ({percent}%)
          </h3>

          <div className="review">
            <h2>Kiértékelés</h2>

            {quiz.map((q, qi) => {
              const ua = userAnswers[qi];
              const picked = new Set(ua?.selectedOriginalIndices ?? []);
              const userCorrect = isSetEqual(picked, q.helyesSet);

              return (
                <div key={qi} className="reviewItem">
                  <div className="reviewQ">
                    <span className="reviewNum">{qi + 1}.</span> {q.kerdes}
                  </div>

                  <div className="reviewA">
                    {q.answers.map((a) => {
                      const isCorrect = q.helyesSet.has(a.originalIndex);
                      const isUserPick = picked.has(a.originalIndex);

                      let cls = "answer";
                      if (isCorrect) cls += " correct";
                      if (isUserPick && !isCorrect) cls += " wrong";

                      return (
                        <div key={a.answerId} className={cls}>
                          {a.szoveg}
                          {isUserPick && isCorrect && <span className="tag ok"> ✓ Helyes</span>}
                          {isUserPick && !isCorrect && <span className="tag bad"> ✗ Hibás</span>}
                          {!userCorrect && isCorrect && <span className="tag should"> (Ezt kellett volna)</span>}
                        </div>
                      );
                    })}
                  </div>

                  <div className="reviewResult">
                    {userCorrect ? (
                      <span className="tag ok">✓ Kérdés helyes</span>
                    ) : (
                      <span className="tag bad">✗ Kérdés hibás</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <button className="btn restartBtn" onClick={restart}>
            Újrakezdés
          </button>
        </>
      )}
      </div>
    </div>
  );
}