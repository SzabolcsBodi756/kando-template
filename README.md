# React + Vite + Kandó

Update: Kandós favicon és specifikus ikonok, BrowserRouter-re és bootstrap-icons-ra felkészítve a main.jsx és a package.json-ben is!
Korábbi npm-es React telepítőről átalakítva Vite-kompatibilissá.
Ez a sablon minimális beállítást biztosít a React Vite-ban való működéséhez HMR-rel és néhány ESLint szabállyal.

Jelenleg két hivatalos bővítmény érhető el:

- A [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) a [Babel](https://babeljs.io/) (vagy az [oxc](https://oxc.rs) plugint használja, amikor a [rolldown-vite](https://vite.dev/guide/rolldown)-ban van) a gyors frissítéshez.

- A [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) a [SWC](https://swc.rs/) plugint használja a gyors frissítéshez.

## React fordító

A React fordító nincs engedélyezve ezen a sablonon a fejlesztési és build teljesítményre gyakorolt ​​hatása miatt. Hozzáadásához lásd [ezt a dokumentációt](https://react.dev/learn/react-compiler/installation).

## Az ESLint konfigurációjának kibővítése

Ha éles alkalmazást fejlesztesz, azt javasoljuk, hogy TypeScriptet használj engedélyezett típustudatos lint szabályokkal. A [TS sablonban](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) találsz információkat arról, hogyan integrálhatod a TypeScriptet és a [`typescript-eslint`](https://typescript-eslint.io) a projektedbe.

- NB Kandó 2025-26
