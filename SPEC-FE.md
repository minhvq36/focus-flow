# SPEC-FE.md — FocusFlow v2 Frontend Specification

> React + TypeScript frontend for task management, garden gamification, and social features

---

## 1. Tech Stack

- **Framework:** React 18+
- **Language:** TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **State Management:** Zustand (global stores)
- **HTTP Client:** React Query (data fetching, caching, sync) + Fetch API wrapper (api.ts for auth injection)
- **Forms:** Plain HTML forms (future: React Hook Form + Zod)
- **Animation:** Tailwind CSS animations + tw-animate-css (future: Framer Motion)
- **Charts/Visuals:** Canvas (garden grid), D3 or Chart.js (stats)
- **Auth:** Supabase Auth (JWT via localStorage)
- **Realtime:** Supabase Realtime (WebSocket for feed, leaderboard)
- **Icons:** Lucide React
- **UI Components:** shadcn components + Tailwind CSS

---

## 2. Project Structure

```
/src
  /pages
    /dashboard          ← Home: task list, mini garden, quota counter
    /focus              ← Minimalist timer screen during task
    /garden             ← Garden layout editor, grid canvas
    /shop               ← Buy/sell items and consumables
    /marketplace        ← Legendary P2P trading
    /leaderboard        ← Global + friends rankings
    /profile            ← User stats, public garden link, hearts
    /social             ← Friends list, activity feed
    /search             ← Task history search
    /settings           ← Penalty mode toggle, plan, account
    /onboarding         ← Signup flow, penalty mode choice, tutorial
    /public             ← Public garden view (read-only)

  /components
    /TaskForm           ← Todo list builder, duration picker
    /FocusTimer         ← Timer display, progress ring, controls
    /GardenCanvas       ← Canvas-based grid renderer
    /GardenItem         ← Sprite rendering (healthy/wilted overlays)
    /RewardModal        ← Drop animation, item preview
    /PenaltyModal       ← Penalty consequence visualization
    /InventoryPanel     ← Item list with filters, drag-drop
    /MarketplaceListing ← Buy/sell interface
    /LeaderboardTable   ← Sortable ranking table
    /SocialFeedItem     ← Feed event card
    /Header             ← Nav, profile button, notifications
    /Sidebar            ← Nav links
    /Loading            ← Skeleton, spinners
    /Modal              ← Reusable modal wrapper

  /hooks
    /useTaskSession     ← Timer state machine (active/paused/submitted)
    /useGarden          ← Grid state, placement logic, level unlock
    /useRealtime        ← Supabase subscription for live updates
    /useReward          ← Reward roll animation, item acquisition
    /usePenalty         ← Penalty flow, item removal animation
    /useInfiniteScroll  ← Pagination helper
    /useLocalStorage    ← Persistent form state recovery
    /useAuth            ← Auth context and login/logout

  /store               ← Zustand stores (global state)
    /taskStore.ts      ← Active task, submitted history, filters
    /gardenStore.ts    ← Garden layouts, placements, selected items
    /userStore.ts      ← User profile, wallets, plan, penalties_mode
    /economyStore.ts   ← Silver/gold balances, transactions
    /socialStore.ts    ← Friends list, leaderboard cache

  /lib
    /api.ts            ← Fetch wrapper with auth, error handling
    /stripe.ts         ← Stripe integration for IAP
    /supabase.ts       ← Supabase client init
    /constants.ts      ← Game constants (drop rates, prices, etc.)
    /utils.ts          ← Helper functions
    /animations.ts     ← Framer Motion variants

  /types
    /api.ts            ← API request/response types
    /task.ts           ← Task-related types
    /garden.ts         ← Garden, placement, item types
    /economy.ts        ← Wallet, transaction types
    /social.ts         ← User, friend, feed types

  /assets
    /sprites           ← Garden item sprite sheets, animations
    /backgrounds       ← Garden theme backgrounds (by level)
    /icons             ← SVG icons
    /fonts             ← Web fonts

  /styles
    /globals.css       ← Tailwind, global overrides
    /animations.css    ← Keyframe animations

  App.tsx             ← Root component, router setup
  main.tsx            ← Entry point
```

---

## 3. Core Pages

### 3.1 Onboarding Flow

**Route:** `/onboarding`

**Status:** ❌ Not Started

**Steps:**
1. **Sign Up**
   - Email/Google OAuth
   - Username input (public, for garden URL validation)
   - Password (if email)

2. **Penalty Mode Choice**
   - Radio buttons: ON / OFF
   - Explanation of consequences
   - Recommended: ON for beginners

3. **Tutorial Task**
   - Pre-filled task: "Complete FocusFlow Tutorial"
   - 15-minute timer
   - Guided checklist
   - On completion → redirect to reward modal

4. **Place First Item**
   - Reward modal shows first flower received
   - Guide: click garden cell to place
   - Automatic redirect to Dashboard after placement

---

### 3.2 Dashboard

**Route:** `/dashboard`

**Status:** ✅ Partially Complete (task list + quota done, mini garden is placeholder)

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ Header (profile, notifications)                     │
├─────────────────────────────────────────────────────┤
│ Sidebar (nav)  │                                     │
│                │  Main Content                       │
│  - Dashboard   │  ┌──────────────────────────────────┐
│  - Focus       │  │ Welcome, [N] tasks left today    │
│  - Garden      │  │                                  │
│  - Shop        │  │ [+ New Task]  [Quota: 3/3] 🔴  │
│  - Marketplace │  │                                  │
│  - Leaderboard │  │ Active Tasks:                    │
│  - Profile     │  │ ┌────────────────────────────────┐
│  - Settings    │  │ │ Task 1 (Reading article)  [Start]
│                │  │ │ Task 2 (Code review)      [Start]
│                │  │ │ Task 3 (Paused) ⏸        [Resume]
│                │  │ │                            [Details]
│                │  │ └────────────────────────────────┘
│                │  │                                  │
│                │  │ Mini Garden Preview:            │
│                │  │ [5×5 grid with placed items]    │
│                │  │ [Progress: 25/25 slots full] ✓  │
│                │  │ [Next: Level 2 (6×6)]           │
│                │  └──────────────────────────────────┘
└─────────────────────────────────────────────────────┘
```

**Components:**
- **Quota Display:** Shows "X/Y tasks used today" with visual indicator
- **Task List:** Active tasks with quick actions (Start, Resume, View)
- **Mini Garden:** Small canvas preview, click to full view
- **Today Stats:** Silver earned today, items dropped, streak indicator

**Key Interactions:**
- Click "New Task" → Modal/form to create task
- Click "Start" → Navigate to Focus page
- Click task → Task detail drawer (notes, todos, timer state)

---

### 3.3 Focus Screen

**Route:** `/focus/:taskId`

**Status:** ⏳ Skeleton Only (needs timer, todo editor, controls, notes)

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ Minimal: just task timer, todos, notes              │
├─────────────────────────────────────────────────────┤
│                                                     │
│         [Task Title: Reading Chapter 5]             │
│                                                     │
│              ⏱ 14:32 / 45:00                        │
│              [=========>................]            │
│                                                     │
│         [ ] Todo 1: Read intro                      │
│         [ ] Todo 2: Take notes                      │
│             [ ] Sub-item 2a: Note keywords         │
│             [ ] Sub-item 2b: Summarize             │
│         [ ] Todo 3: Quiz yourself                  │
│         [+ Add] [Delete selected]                  │
│                                                     │
│         Notes (scrollable audit trail):             │
│         ┌─────────────────────────────────────┐   │
│         │ 14:32 Started reading intro...      │   │
│         │ 15:15 Found important section       │   │
│         │ [+ Add note]                        │   │
│         └─────────────────────────────────────┘   │
│                                                     │
│    [⏸ Pause]  [⏩ +15 min]  [Stop]                │
│    [✅ Submit]        [🏳 Give Up]                 │
│                                                     │
│    (All buttons at bottom, spaced)                 │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Key Features:**
- **Timer:**
  - Frontend updates every 100ms from local state + server delta
  - Recovery: if page closes/crashes, queries server on mount, resumes from server time
  - Automatic cap: when elapsed >= registered_duration_min, show "Time's up!" + Extend button
  - No hard limit: user can keep extending or submit anytime

- **Todos:**
  - Checkbox-based, nested (indent = sub-item)
  - Drag-drop to reorder (optional)
  - Add/remove on-the-fly (minimum 1 item enforced)
  - **Real-time sync feedback:** Show subtle sync indicator (✓ saved / 🔄 syncing) next to todos section
    - User checks todo → Instant visual update → Debounce 1 sec → Backend syncs
    - If sync pending > 2 sec, show warning toast "Changes may be lost"
  - Recovery on page reload: todos restored from DB

- **Notes Audit Trail:**
  - Append-only, shows timestamps
  - User can add note during session
  - Scrollable, auto-scroll to latest

- **Controls:**
  - Pause/Resume Toggle: Single button that pauses timer when active, resumes when paused
  - +15 min: extend duration, update display
  - Stop/Leave: confirm dialog, return to dashboard (discards session)
  - Submit: send to server, auto-mark all todos as done
  - Give Up: confirm dialog, penalty flow if enabled

**State Management:**
- Use `useTaskSession` hook (Redux/Zustand) to track:
  - started_at (local timezone)
  - actual_duration_sec (accumulated)
  - paused state
  - todos state
- Validate against server timer state on mount (recovery)

---

### 3.4 Garden Page

**Route:** `/garden/:index` (default index=1)

**Status:** ❌ Not Started (placeholder component only)

**Layout:**
```
┌──────────────────────────────────────────────────────┐
│ Header: Level 1 / 20  [Info] [Expand (if lvl 20)]    │
├──────────────────────────────────────────────────────┤
│ Left Panel (Sidebar)   │ Main Canvas + Grid           │
│                        │                              │
│ Inventory:             │ ┌─────────────────────────┐  │
│ [Filter by rarity]     │ │ [5×5 Canvas Grid]       │  │
│ ┌────────────────────┐ │ │ [Visual render with]    │  │
│ │ Common (25)        │ │ │ [placed items, wilted   │  │
│ │ [🌸] Rose          │ │ │ [overlays, empty slots] │  │
│ │ [🌸] Daisy         │ │ │                         │  │
│ │ Uncommon (5)       │ │ │ Progress: 25/25 ✓      │  │
│ │ [🌼] Sunflower     │ │ │ [Next Level Preview]    │  │
│ │ [Rare...]          │ │ └─────────────────────────┘  │
│ │ [Epic...]          │ │                              │
│ │ [Legendary] (1)    │ │ [Watering Can] (use)    │  │
│ │ [🏆] Moonflower    │ │ [Back to Dashboard]     │  │
│ │                    │ │                         │  │
│ │ (Drag items to     │ │ (Click empty cell to     │  │
│ │  grid)             │ │  place, drag to move)   │  │
│ └────────────────────┘ │                         │  │
└──────────────────────────────────────────────────────┘
```

**Interactions:**
- **Drag from Inventory → Grid Cell:** Place item
- **Drag in Grid:** Reposition item
- **Right-click Item:** Remove, rotate, watering (if wilted)
- **Hover Empty Cell:** Show grid coordinates (optional)
- **Level Indicator:** Shows progress to next level, locked levels greyed out
- **Expand Level 20:** Button at top, confirm purchase (cost in silver)

**Canvas Rendering:**
- Use HTML5 Canvas or React Canvas library
- Render grid lines, cells, sprites
- Smooth drag-drop with feedback (highlight valid cells)
- Health status visual: healthy = full color, wilted = desaturated + icon

---

### 3.5 Shop Page

**Route:** `/shop`

**Status:** ❌ Not Started

**Tabs:**
1. **Buy**
   - Catalog of purchasable items (Common-Rare, structures, frames, watering)
   - Filter by: rarity, type, price range
   - For each item:
     - Icon, name, rarity badge
     - Price (🪙 silver or 💛 gold)
     - [Buy] button, quantity input
   - Confirm dialog with total cost

2. **Sell**
   - Inventory of user's items
   - Sort by: rarity, recently acquired
   - For each item: [Sell for X silver] button
   - Legendary: [Sell for 1 gold] button

3. **Watering Cans** (or part of Buy)
   - "Restore wilted items"
   - [Buy 1] [Buy 5] [Buy 10] options
   - Price: 50 silver each

**State:**
- Confirm modal with total cost before purchase
- Toast notification on success/fail

---

### 3.6 Marketplace Page

**Route:** `/marketplace`

**Status:** ❌ Not Started

**Tabs:**

**Buy Tab:**
- List of active Legendary listings
- Sort by: price (low→high), newest
- For each listing:
  - Seller profile, item icon, price (gold)
  - [Buy Now] button (if user has enough gold)
  - Last transaction price for reference

**Sell Tab:**
- User's Legendary items (from inventory)
- For each:
  - Item preview
  - [List for Sale] button
  - Price input (min 5 gold)
  - [Confirm] dialog

---

### 3.7 Leaderboard Page

**Route:** `/leaderboard`

**Status:** ❌ Not Started

**Tabs:**

**Global:**
- Top 100 users by garden value
- Columns: Rank, Username, Garden Value (🪙), Legendary Count
- [View Garden] button → public garden URL
- [Add Friend] button (if not friend already)

**Friends:**
- Top 20 friends by garden value
- Same layout as Global
- If no friends: "Add friends to see their rankings!"

**My Rank:**
- Show user's rank, value, position in global 100
- "You're ranked #X out of 10,000 players"

**Filters:**
- Refresh rate: auto-refresh every 5 min (or manual "Refresh" button)

---

### 3.8 Profile Page

**Route:** `/profile/:username` or `/profile/me`

**Status:** ❌ Not Started

**Layout:**
```
┌────────────────────────────────────────┐
│ Avatar [Frame]  │ Display Name         │
│                 │ Bio                  │
│                 │ ❤️ 42 hearts         │
├────────────────────────────────────────┤
│ Stats:                                 │
│ - Total tasks: 234                     │
│ - Completion rate: 92%                 │
│ - Garden value: 1.2M silver            │
│ - Streak: 23 days                      │
├────────────────────────────────────────┤
│ Public Garden: [🔗 focusflow.app/garden/@username]
│ (Garden 1 preview thumbnail)           │
│ [View Full Garden]  [Like]             │
└────────────────────────────────────────┘

[If profile is own]:
│ [Edit Profile]  [Settings]  [Logout]   │
```

---

### 3.9 Social Page

**Route:** `/social`

**Status:** ❌ Not Started

**Friends Management:**
- Tab: "Friends" → list of accepted friends
- Tab: "Requests" → pending requests (sent/received)
- [+ Add Friend] button → search by username

**Feed:**
- Activity from friends (7 day window)
- Events: level_up, legendary_drop, top10_rank, streak_milestone
- For each event:
  - Friend avatar, event description, timestamp
  - [Like] [View Garden] buttons

---

### 3.10 Settings Page

**Route:** `/settings`

**Status:** ❌ Not Started

**Sections:**

**Game Settings:**
- **Penalty Mode:** Toggle ON/OFF
  - Label: "Enable penalty (items wilted when giving up)"
  - Explanation: "When you give up a task with this ON, 1-3 items from your garden will be affected."

**Account Settings:**
- Display name (editable)
- Bio (editable)
- Email (read-only)
- Active avatar frame (selector)
- Plan type (Free/Pro/Premium) with upgrade button

**Notification Settings:**
- Push notifications (future)
- Feed activity emails (future)

**Subscription:**
- Current plan, renewal date
- [Upgrade to Pro] [Upgrade to Premium] buttons

**Danger Zone:**
- [Delete Account] (irreversible)

---

## 4. Global State (Zustand Stores)

### ✅ 4.1 userStore (Implemented)
```typescript
type UserStore = {
  user: User | null;
  loading: boolean;
  
  setUser: (user: User | null) => void;
  restoreSession: () => Promise<void>;
  logout: () => Promise<void>;
};
```

### ❌ 4.2 taskStore (TODO)
```typescript
type TaskStore = {
  // Current active task
  activeTask: Task | null;
  activeTaskTimerState: {
    started_at: number | null; // epoch ms
    actual_duration_sec: number;
    registered_duration_min: number;
  };
  
  // Task list
  tasks: Task[];
  taskFilters: { status?: string; date_range?: [Date, Date] };
  
  // Actions
  setActiveTask: (task: Task) => void;
  updateTimerState: (delta) => void;
  submitTask: (task_id) => Promise<void>;
  giveUpTask: (task_id) => Promise<void>;
};
```

### ❌ 4.3 gardenStore (TODO)
```typescript
type GardenStore = {
  gardens: Garden[];
  currentGardenIndex: number;
  placements: GardenPlacement[];
  selectedInventoryItem: InventoryItem | null;
  
  setCurrentGarden: (index: number) => void;
  placeItem: (grid_x, grid_y, item_id) => Promise<void>;
  removeItem: (placement_id) => Promise<void>;
  selectInventoryItem: (item_id) => void;
};
```

### ❌ 4.4 economyStore (TODO)
```typescript
type EconomyStore = {
  silver: bigint;
  gold: number;
  transactions: Transaction[];
  
  updateBalance: () => Promise<void>;
  recordTransaction: (tx: Transaction) => void;
};
```

### ❌ 4.5 socialStore (TODO)

---

## 5. Custom Hooks

### ❌ 5.1 useTaskSession (TODO — with Todos Debounce)

**State Management Strategy:**
- **Local state is source of truth** during Focus session
- Todos edited in real-time → Zustand taskStore → Debounce 1-2s → PATCH DB
- Force sync (bypass debounce) on: Pause Task, Submit, Give Up
- Tab close/crash: Recovery syncs todos from DB (may lose edits in last 2 sec, acceptable for edge case)

```typescript
const useTaskSession = (taskId: string) => {
  const [state, setState] = useState<'active' | 'paused' | 'submitted'>('active');
  const [elapsedSec, setElapsedSec] = useState(0);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [todosSyncPending, setTodosSyncPending] = useState(false);
  
  // Debounced todos sync to DB (1 sec idle)
  const debouncedSaveTodos = useCallback((updatedTodos: TodoItem[]) => {
    const timer = setTimeout(async () => {
      try {
        setTodosSyncPending(true);
        await api.patch(`/tasks/${taskId}/todos`, { todos: updatedTodos });
        setTodosSyncPending(false);
      } catch (err) {
        console.error('Failed to sync todos:', err);
        setTodosSyncPending(false);
        // Show warning: Changes may be lost
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [taskId]);
  
  const updateTodos = (newTodos: TodoItem[]) => {
    setTodos(newTodos);  // Instant local update
    debouncedSaveTodos(newTodos);  // Debounced DB sync
  };
  
  // Force sync: used when leaving Focus screen
  const forceSyncTodos = async () => {
    await api.patch(`/tasks/${taskId}/todos`, { todos });
  };
  
  const start = () => { /* set started_at, query DB for todos */ };
  const pause = () => { /* accumulate actual_duration_sec, force sync todos */ };
  const resume = () => { /* reset started_at */ };
  const submit = () => { /* force sync todos, validate all checked */ };
  const giveUp = () => { /* force sync todos, penalty flow */ };
  
  // Recovery on mount: fetch latest state from server
  useEffect(() => {
    (async () => {
      try {
        const task = await api.get(`/tasks/${taskId}`);
        setTodos(task.todos);
        setElapsedSec(calculateElapsedSec(task));
      } catch (err) {
        console.error('Failed to restore task state:', err);
      }
    })();
  }, [taskId]);
  
  return { 
    state, 
    elapsedSec, 
    todos, 
    updateTodos, 
    forceSyncTodos,
    todosSyncPending,
    start, 
    pause, 
    resume, 
    submit, 
    giveUp 
  };
};
```

**Todos Object Structure:**
```typescript
interface TodoItem {
  id: string;        // UUID for unique tracking
  text: string;
  done: boolean;     // Changed from 'checked' to 'done'
  children?: TodoItem[];  // Nested structure (recursive) instead of indent level
}
```

**When to Force Sync:**
- User clicks "Pause Task" → `forceSyncTodos()` before navigation
- User clicks "Submit" → `forceSyncTodos()` before validation
- User clicks "Give Up" → `forceSyncTodos()` before penalty flow
- Tab close/beforeunload → `forceSyncTodos()` (optional safety net)

### ❌ 5.2 useGarden (TODO)
```typescript
const useGarden = (gardenIndex: number) => {
  const [grid, setGrid] = useState<GardenPlacement[]>([]);
  
  const placeItem = (x, y, item_id) => { /* API call */ };
  const removeItem = (placement_id) => { /* API call */ };
  const moveItem = (placement_id, new_x, new_y) => { /* API call */ };
  
  return { grid, placeItem, removeItem, moveItem };
};
```

### 5.3 useRealtime
```typescript
const useRealtime = () => {
  useEffect(() => {
    const subscription = supabase
      .from('feed_events')
      .on('*', payload => {
        // update feed
      })
      .subscribe();
    
    return () => subscription.unsubscribe();
  }, []);
};
```

---

## 6. Animation & Transitions

### 6.1 Reward Modal
```typescript
// Framer Motion variants
const rewardVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: { 
    scale: 1, 
    opacity: 1,
    transition: { type: 'spring', stiffness: 100 }
  }
};

// Legendary confetti animation
if (rarity === 'legendary') {
  triggerConfetti({ particleCount: 150, spread: 60 });
}
```

### 6.2 Penalty Modal
```typescript
// Item removal animation
const itemRemoveVariants = {
  exit: { 
    scale: 0, 
    rotate: 360,
    opacity: 0,
    transition: { duration: 0.6 }
  }
};
```

---

## 7. Forms & Validation

### 7.1 Create Task Form
```typescript
const schema = z.object({
  title: z.string().min(1, "Title required"),
  todos: z.array(z.string().min(1)).min(1, "Min 1 todo"),
  duration_min: z.number().min(15).max(480) // 15 min to 8 hours
});

type FormData = z.infer<typeof schema>;
```

### 7.2 Marketplace Listing Form
```typescript
const schema = z.object({
  price_gold: z.number().min(5, "Min 5 gold"),
  item_id: z.string().uuid()
});
```

---

## 8. Responsive Design

### Breakpoints (Tailwind)
- **Mobile:** sm (640px) - single column layout
- **Tablet:** md (768px) - sidebar collapses to hamburger menu
- **Desktop:** lg (1024px) - sidebar always visible

**Key Pages:**
- Focus screen: works on mobile, full-screen canvas
- Garden canvas: touch-friendly, drag-drop on mobile (with alternative buttons)
- Task list: card layout on mobile, table layout on desktop

---

## 9. Accessibility

- Semantic HTML (buttons, forms, landmarks)
- ARIA labels for complex components (canvas, modals)
- Keyboard navigation (Tab, Enter, Escape)
- Color contrast: WCAG AA minimum
- Focus indicators visible
- No auto-playing audio/video

---

## 10. Performance Optimization

### Code Splitting
- Each page as separate chunk
- Lazy-load heavy components (canvas, charts)

### Data Caching
- React Query with stale-while-revalidate strategy
- Garden data cached for 5 minutes
- Leaderboard cached for 5 minutes

### Rendering
- Memoize expensive components (GardenCanvas, LeaderboardTable)
- Virtual scrolling for long lists (inventory, feed)

### Images & Assets
- Sprite sheets for garden items
- WebP format with fallback
- Lazy-load off-screen images

---

## 11. Error Boundaries

```typescript
<ErrorBoundary fallback={<ErrorPage />}>
  <AppRoutes />
</ErrorBoundary>
```

---

## 12. Testing Strategy

### Unit Tests
- Form validation (Zod schemas)
- Timer calculations (state machine)
- Reward roll logic (RNG)

### Integration Tests
- Task creation → submission → reward flow
- Garden placement → level unlock
- Marketplace buy/sell

### E2E Tests (Playwright)
- Onboarding flow
- Daily task workflow
- Garden management
- Social interactions

---

## 13. Browser Support

- Chrome/Edge: latest 2 versions
- Firefox: latest 2 versions
- Safari: latest 2 versions
- Mobile: iOS 14+, Android 9+

---

## 14. Build & Deployment

- **Build:** Vite build → optimized JS bundles
- **Deploy:** Vercel or similar (static hosting)
- **Environment:** .env.local for API endpoints
- **PWA:** Service worker for offline capability (future)
