# 只学新词 (Only New Words) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "只学新词" toggle that filters out already-learned words from phase1 learning units, reorganizing remaining new words into units of 10. Phase2 sentence exercises are unaffected. The master word list is maintained per-language in the `languages` directory for efficient cross-file querying.

**Architecture:** 
1. Maintain a per-language master word index in `/workspace/data/languages/{source_lang}/master_words.json` — a simple set of lowercase words that have appeared in any file's vocab for that language.
2. When "只学新词" is enabled, the backend filters the learning plan to exclude words already in the master word list, re-groups remaining items into units of 10, and returns the filtered plan. The original plan is preserved so toggling off restores it.
3. Frontend adds a toggle next to "跳过听力", saves the preference to config, and refreshes units on toggle.

**Tech Stack:** React (Framer Motion), FastAPI, file-based JSON storage

---

## File Structure

| File | Responsibility |
|------|---------------|
| `/workspace/backend/storage.py` | Add `save_master_words`, `load_master_words`, `add_words_to_master` methods |
| `/workspace/backend/main.py` | Add `/api/{file_id}/phase/1/units?new_words_only=true` support; update word-list endpoint to use master index; call `add_words_to_master` after vocab generation |
| `/workspace/frontend/src/components/AllUnitsStep.jsx` | Add "只学新词" toggle UI |
| `/workspace/frontend/src/App.jsx` | Add `newWordsOnly` state, pass to AllUnitsStep, save to config |
| `/workspace/frontend/src/utils/api.js` | Add `new_words_only` query param to units API call |
| `/workspace/frontend/src/utils/translations.js` | Add translation keys |

---

### Task 1: Backend — Master Word Index in languages directory

**Files:**
- Modify: `/workspace/backend/storage.py`

- [ ] **Step 1: Add master word methods to Storage class**

Add these methods after `load_user_preferences` (around line 459):

```python
def _get_master_words_path(self, source_lang: str) -> Path:
    lang_dir = self.languages_dir / source_lang
    lang_dir.mkdir(parents=True, exist_ok=True)
    return lang_dir / "master_words.json"

def load_master_words(self, source_lang: str) -> set:
    path = self._get_master_words_path(source_lang)
    if path.exists():
        try:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return set(data.get("words", []))
        except (json.JSONDecodeError, IOError):
            pass
    return set()

def save_master_words(self, source_lang: str, words: set):
    path = self._get_master_words_path(source_lang)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump({"words": sorted(list(words))}, f, ensure_ascii=False, indent=2)

def add_words_to_master(self, source_lang: str, new_words: list):
    current = self.load_master_words(source_lang)
    current.update(w.lower() for w in new_words if w)
    self.save_master_words(source_lang, current)
```

- [ ] **Step 2: Verify the methods work**

Run: `cd /workspace/backend && python3 -c "from storage import Storage; s = Storage(); s.add_words_to_master('en', ['hello', 'world']); print(s.load_master_words('en'))"`
Expected: `{'hello', 'world'}`

---

### Task 2: Backend — Update vocab generation to populate master words

**Files:**
- Modify: `/workspace/backend/main.py`

- [ ] **Step 1: Call `add_words_to_master` after vocab is generated**

In the `process_sentences_background` function, after `storage.save_vocab(file_id, all_vocab)` (around line 654), add:

```python
language_settings = storage.load_language_settings(file_id)
source_lang = language_settings.get("source_lang", "en")
all_word_texts = [entry.get("word", "") for entry in all_vocab if entry.get("word")]
storage.add_words_to_master(source_lang, all_word_texts)
```

Note: `language_settings` is already loaded earlier in this function (line 912), but we need it here too since this is in the background function scope. Check if it's available — it is loaded at line 534 as part of the outer function. Verify the variable is accessible.

- [ ] **Step 2: Verify master words are populated after processing**

Run the backend and process a text file, then check `/workspace/data/languages/en/master_words.json` exists and contains words.

---

### Task 3: Backend — Add `new_words_only` support to phase1 units API

**Files:**
- Modify: `/workspace/backend/main.py`

- [ ] **Step 1: Add query parameter to `get_phase_units` endpoint**

Change the endpoint signature (around line 2632):

```python
@app.get("/api/{file_id}/phase/{phase_number}/units")
async def get_phase_units(file_id: str, phase_number: int, new_words_only: bool = False):
```

- [ ] **Step 2: Add filtering logic for phase1 when `new_words_only=True`**

After the existing phase1 unit generation logic (after line 2698), add filtering before the return statement. The key idea: when `new_words_only=True`, filter out word items whose vocab word is in the master word list, then re-group remaining items into units of 10.

Insert before the `return` statement for phase1 (around line 2683):

```python
if new_words_only and phase_number == 1:
    language_settings = storage.load_language_settings(file_id)
    source_lang = language_settings.get("source_lang", "en")
    master_words = storage.load_master_words(source_lang)
    
    if master_words:
        filtered_plan = []
        for unit in plan:
            items = unit.get("items", [])
            filtered_items = []
            for item in items:
                if item.get("type") == "word":
                    vi = item.get("vocab_index")
                    if vi is not None and vi < len(vocab):
                        word = vocab[vi].get("word", "").lower()
                        if word in master_words:
                            continue
                filtered_items.append(item)
            if filtered_items:
                filtered_plan.extend(filtered_items)
        
        max_items_per_unit = 10
        new_plan = []
        for i in range(0, len(filtered_plan), max_items_per_unit):
            chunk = filtered_plan[i:i + max_items_per_unit]
            new_plan.append({
                "unit_id": len(new_plan),
                "items": chunk
            })
        
        phase1_units = []
        accumulated = 0
        for i, unit_plan in enumerate(new_plan):
            items = unit_plan.get("items", [])
            start_index = accumulated
            end_index = accumulated + len(items)
            word_count = sum(1 for item in items if item["type"] == "word")
            completed = max_index >= end_index
            word_items = [item for item in items if item["type"] == "word"]
            all_words_cached = True
            for item in word_items:
                vi = item.get("vocab_index")
                if vi is not None and vi < len(vocab):
                    w = vocab[vi].get("word", "")
                    if w and not storage.load_word_cache(file_id, w):
                        all_words_cached = False
                        break
            phase1_units.append({
                "word_count": word_count,
                "exercises_count": len(items),
                "completed": completed,
                "start_index": start_index,
                "end_index": end_index,
                "generating": not all_words_cached
            })
            accumulated += len(items)
        
        current_unit = 0
        for i, unit in enumerate(phase1_units):
            if current_index < unit["end_index"]:
                current_unit = i
                break
        else:
            current_unit = len(phase1_units) - 1 if phase1_units else 0
        
        return {
            "phase_number": phase_number,
            "units": [
                {
                    "unit_id": i,
                    "word_count": unit["word_count"],
                    "exercises_count": unit["exercises_count"],
                    "completed": unit["completed"],
                    "start_index": unit["start_index"],
                    "end_index": unit["end_index"],
                    "generating": unit["generating"]
                }
                for i, unit in enumerate(phase1_units)
            ],
            "current_unit": current_unit,
            "new_words_only": True
        }
```

- [ ] **Step 3: Also add `new_words_only` support to the phase1 unit exercise endpoint**

The `get_phase_unit_exercise` endpoint (line 2769) also needs to handle the filtered plan. Add `new_words_only: bool = False` parameter and use the same filtering logic to resolve the correct item from the filtered plan.

Change signature:
```python
@app.get("/api/{file_id}/phase/{phase_number}/unit/{unit_id}")
async def get_phase_unit_exercise(file_id: str, phase_number: int, unit_id: int, new_words_only: bool = False):
```

In the phase1 branch of this endpoint, after loading the plan, add filtering:
```python
if new_words_only and phase_number == 1:
    language_settings = storage.load_language_settings(file_id)
    source_lang = language_settings.get("source_lang", "en")
    master_words = storage.load_master_words(source_lang)
    
    if master_words:
        filtered_items = []
        for unit in plan:
            items = unit.get("items", [])
            for item in items:
                if item.get("type") == "word":
                    vi = item.get("vocab_index")
                    if vi is not None and vi < len(vocab):
                        word = vocab[vi].get("word", "").lower()
                        if word in master_words:
                            continue
                filtered_items.append(item)
        
        max_items_per_unit = 10
        new_plan = []
        for i in range(0, len(filtered_items), max_items_per_unit):
            chunk = filtered_items[i:i + max_items_per_unit]
            new_plan.append({
                "unit_id": len(new_plan),
                "items": chunk
            })
        plan = new_plan
```

- [ ] **Step 4: Verify the API works**

Run: `curl "http://localhost:8000/api/{file_id}/phase/1/units?new_words_only=true"` and check the response has fewer units.

---

### Task 4: Backend — Optimize word-list endpoint to use master words index

**Files:**
- Modify: `/workspace/backend/main.py`

- [ ] **Step 1: Add a fast word existence check endpoint**

Add a new endpoint that checks which words from a list are already in the master word list:

```python
@app.post("/api/master-words/check")
async def check_master_words(request: dict):
    source_lang = request.get("source_lang", "en")
    words = request.get("words", [])
    master_words = storage.load_master_words(source_lang)
    known = [w for w in words if w.lower() in master_words]
    new = [w for w in words if w.lower() not in master_words]
    return {"known_words": known, "new_words": new, "known_count": len(known), "new_count": len(new)}
```

- [ ] **Step 2: Update get_word_list to optionally use master index for faster loading**

The existing `/api/word-list` endpoint iterates all files to merge vocab. We can optimize by also saving a merged vocab per language. But this is a nice-to-have optimization — the current approach works. Skip for now and revisit if performance is an issue.

---

### Task 5: Backend — Add `new_words_only` to user preferences

**Files:**
- Modify: `/workspace/backend/main.py`

- [ ] **Step 1: Add `new_words_only` field to UserPreferencesUpdate model**

In the `UserPreferencesUpdate` class (around line 3393), add:

```python
new_words_only: Optional[bool] = None
```

- [ ] **Step 2: Add handler in update_user_preferences**

After the `skip_listening` handler (line 3416), add:

```python
if req.new_words_only is not None:
    current["new_words_only"] = req.new_words_only
```

- [ ] **Step 3: Add default in load_user_preferences**

In `storage.py`, update the default return in `load_user_preferences` (line 459):

```python
return {"source_lang": "auto", "target_lang": "zh", "rpm": 60, "skip_listening": False, "new_words_only": False}
```

---

### Task 6: Frontend — Add "只学新词" toggle and state management

**Files:**
- Modify: `/workspace/frontend/src/App.jsx`
- Modify: `/workspace/frontend/src/utils/translations.js`
- Modify: `/workspace/frontend/src/utils/api.js`

- [ ] **Step 1: Add `newWordsOnly` state in App.jsx**

After `skipListening` state (line 99), add:

```jsx
const [newWordsOnly, setNewWordsOnly] = useState(false)
```

- [ ] **Step 2: Load `newWordsOnly` from preferences**

In the `getUserPreferences` callback (around line 117), add:

```jsx
if (prefs.new_words_only !== undefined) setNewWordsOnly(prefs.new_words_only)
```

- [ ] **Step 3: Add handler**

After `handleSkipListeningChange` (line 1038), add:

```jsx
const handleNewWordsOnlyChange = (value) => {
    setNewWordsOnly(value)
    api.saveUserPreferences({ new_words_only: value }).catch(() => {})
}
```

- [ ] **Step 4: Pass `newWordsOnly` and handler to AllUnitsStep**

In the AllUnitsStep JSX (around line 1310), add props:

```jsx
newWordsOnly={newWordsOnly}
onNewWordsOnlyChange={handleNewWordsOnlyChange}
```

- [ ] **Step 5: Add translation keys**

In `/workspace/frontend/src/utils/translations.js`, add to both `zh` and `en` sections:

Chinese section:
```javascript
newWordsOnly: "只学新词",
```

English section:
```javascript
newWordsOnly: "New Words Only",
```

- [ ] **Step 6: Update api.js to pass `new_words_only` param**

In the `getPhaseUnits` function, add the `new_words_only` query parameter when fetching phase1 units.

---

### Task 7: Frontend — Add toggle UI in AllUnitsStep

**Files:**
- Modify: `/workspace/frontend/src/components/AllUnitsStep.jsx`

- [ ] **Step 1: Add toggle UI next to "跳过听力"**

In the nav bar section (around line 208), add a similar toggle before the skipListening toggle:

```jsx
<label className="flex items-center gap-1.5 cursor-pointer select-none group mr-2">
  <span className="text-[11px] text-stone-400 group-hover:text-stone-600 transition-colors flex items-center gap-1">
    <BookOpen className="w-3 h-3" />
    {t.newWordsOnly || '只学新词'}
  </span>
  <div className="relative">
    <input
      type="checkbox"
      checked={newWordsOnly || false}
      onChange={(e) => onNewWordsOnlyChange?.(e.target.checked)}
      className="sr-only peer"
    />
    <div className="w-7 h-4 bg-stone-200 peer-focus:outline-none rounded-full peer-checked:bg-amber-400 transition-colors" />
    <div className="absolute left-[1.5px] top-[1.5px] bg-white w-[13px] h-[13px] rounded-full transition-transform peer-checked:translate-x-3 shadow-sm" />
  </div>
</label>
```

- [ ] **Step 2: Add props to component signature**

Add `newWordsOnly` and `onNewWordsOnlyChange` to the component's props.

- [ ] **Step 3: Pass `new_words_only` when fetching units**

When the component calls the API to get phase units, it should pass the `new_words_only` query parameter. This is handled in App.jsx — check how `phase1Units` and `phase2Units` are fetched.

---

### Task 8: Frontend — Refresh units on toggle change

**Files:**
- Modify: `/workspace/frontend/src/App.jsx`

- [ ] **Step 1: Re-fetch units when `newWordsOnly` changes**

Add a `useEffect` that re-fetches phase units when `newWordsOnly` changes:

```jsx
useEffect(() => {
    if (step === 'all-units' && currentFileId) {
        fetchPhaseUnits(currentFileId)
    }
}, [newWordsOnly])
```

Where `fetchPhaseUnits` is the existing function that loads phase1 and phase2 units. Verify this function exists and accepts the `new_words_only` parameter.

- [ ] **Step 2: Update fetchPhaseUnits to pass `new_words_only`**

Find the function that fetches phase units and add the `new_words_only` query parameter when calling the API for phase 1.

---

### Task 9: Integration test — End-to-end verification

- [ ] **Step 1: Start backend and frontend**

- [ ] **Step 2: Process a text and verify master_words.json is created**

- [ ] **Step 3: Navigate to learning units, toggle "只学新词", verify units change**

- [ ] **Step 4: Toggle off, verify units restore to original**

- [ ] **Step 5: Verify phase2 units are unaffected**

- [ ] **Step 6: Verify preference persists after page reload**
