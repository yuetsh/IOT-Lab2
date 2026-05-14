import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import './db'
import { groupsRouter } from './routes/groups'
import { chatRouter } from './routes/chat'
import { journalRouter } from './routes/journal'
import { stickersRouter } from './routes/stickers'
import { adminRouter } from './routes/admin'

const app = new Elysia()
  .use(cors())
  .use(groupsRouter)
  .use(chatRouter)
  .use(journalRouter)
  .use(stickersRouter)
  .use(adminRouter)
  .listen(3000)

console.log(`Server running at http://localhost:${app.server?.port}`)
