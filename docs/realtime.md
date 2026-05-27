# Realtime (Socket.IO)

Server: `apps/backend/src/socket/index.ts`

## Namespaces

| Namespace | Events |
|-----------|--------|
| `/tournaments` | `tournament:feed`, `tournament:update` |
| `/leaderboards` | `leaderboard:snapshot`, `leaderboard:patch` |
| `/jackpot` | `jackpot:tick` |

## Client usage

```typescript
import { io } from "socket.io-client";
import { SOCKET_NAMESPACES } from "@frx/shared";

const socket = io("http://localhost:4000/tournaments");
socket.on("tournament:feed", (tournaments) => { /* ... */ });
```

React hooks: `apps/web/lib/hooks/useSocket.ts`

## Broadcast intervals

- Tournament feed: 15s
- Leaderboard patches: 10s
- Jackpot tick: 30s

Event schemas are defined in `packages/shared/src/socket-events.ts`.
