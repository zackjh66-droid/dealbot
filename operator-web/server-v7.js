import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir=path.dirname(fileURLToPath(import.meta.url))
let src=fs.readFileSync(path.join(dir,'server-v6.js'),'utf8')

src=src.replace(
  "const PORT=Number(process.env.PORT||10000),dir=path.dirname(fileURLToPath(import.meta.url))",
  `const PORT=Number(process.env.PORT||10000),dir=${JSON.stringify(dir)}`
)

src=src.replace('const css=fs.readFileSync(', 'let css=fs.readFileSync(')

const oldJs="const js=fs.readFileSync(path.join(dir,'site-v6.js'),'utf8'),icons=fs.readFileSync(path.join(dir,'operator-icons-v2.svg'),'utf8')"
const newJs=`css += '\n.ownerBox{display:none!important}.providerLogo{background:transparent!important}.connector .connectBtn:disabled{opacity:.55;cursor:not-allowed}'\nconst js=fs.readFileSync(path.join(dir,'site-v6.js'),'utf8')\n  .replace(\"b.textContent='Owner setup required';st.textContent='Not configured'\",\"b.textContent='Unavailable';st.textContent='Provider registration pending'\")\n  .replace(\"d.error||'Provider app is not configured yet.'\",\"d.error||'This provider connection is not available yet.'\"),icons=fs.readFileSync(path.join(dir,'operator-icons-v2.svg'),'utf8')`
src=src.replace(oldJs,newJs)

src=src.replaceAll('/operator-logo-v6.png?v=6','/operator-logo-v7.png?v=7')
src=src.replaceAll("u.pathname==='/operator-logo-v6.png'","u.pathname==='/operator-logo-v7.png'")
src=src.replace("console.log('OPERATOR v6 listening on '+PORT)","console.log('OPERATOR v7 listening on '+PORT)")

await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'))
