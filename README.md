# Simulado Digital de Ossos

Site estático offline gerado a partir do PDF `Elany - SIMULADO PRÁTICO DE OSSOS.pdf`.

## Como abrir

Abra `index.html` no navegador. O app usa `data/questions.js`, então funciona mesmo sem servidor local.

## Como regenerar

Rode:

```powershell
& 'C:\Users\wendr\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' tools\generate_simulado.py
```

O script recria as imagens em `assets/pages` e os arquivos `data/questions.json` e `data/questions.js`.
