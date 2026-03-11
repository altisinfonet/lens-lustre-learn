

# Cover Photo Area Positioner

## Problem
When users upload a cover photo, it's displayed with `object-cover` in a fixed-height container (h-48 to h-80). Users have no control over which part of the image is visible — it always centers by default, which often crops out the subject.

## Solution
Add a repositioning tool that lets users drag their cover photo vertically to choose the visible area, then save that position. This is the same pattern used by Facebook/LinkedIn cover photos.

## Technical Approach

### 1. Database — Add `cover_position` column
- Add a `cover_position` float column (0–100, default 50) to the `profiles` table representing the vertical `object-position` percentage.

### 2. Cover Photo Display (`PublicProfile.tsx`)
- Apply `object-position: center ${cover_position}%` to the cover `<img>` tag so the saved position is always respected.

### 3. Reposition Mode (`PublicProfile.tsx`)
- Add a "Reposition" button next to the existing "Change Cover" button (only visible to owner when a cover exists).
- When clicked, enter reposition mode:
  - The cover image becomes draggable vertically (cursor: grab/grabbing).
  - A small toolbar appears with "Save Position" and "Cancel" buttons.
  - User drags the image up/down; the `object-position` Y% updates in real-time.
  - On save, persist the new `cover_position` value to the `profiles` table.
  - On cancel, revert to the previous position.

### 4. Also integrate with cover upload flow
- After uploading a new cover photo, automatically enter reposition mode so the user can immediately adjust framing.

### Files to modify
- **Migration**: Add `cover_position` column to `profiles`
- **`src/pages/PublicProfile.tsx`**: Add reposition UI, drag logic, save handler, and dynamic `object-position` style
- No new components needed — the drag interaction is simple enough to live inline

