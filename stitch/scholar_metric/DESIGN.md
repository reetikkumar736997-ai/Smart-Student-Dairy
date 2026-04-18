# Design System Specification: The Academic Precision Framework

## 1. Overview & Creative North Star: "The Intellectual Atelier"
The Creative North Star for this design system is **The Intellectual Atelier**. 

In professional management, the "template" look creates a sense of cold, industrial automation. We are moving away from that. This system is designed to feel like a high-end, curated workspace—a digital studio where academic rigor meets modern fluid design. We achieve this by breaking the rigid 12-column grid through **intentional asymmetry** and **tonal layering**. 

Instead of boxed-in layouts, we use vast breathing room, sophisticated "Editorial" typography scales, and overlapping elements that suggest depth and intellectual flow. The goal is an interface that feels less like software and more like a premium, custom-bound academic journal.

---

## 2. Colors: Tonal Depth & Meaning
The palette is built on a foundation of professional authority (`primary`) and student-centric approachability (`secondary`). 

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid borders to define sections or containers. Structural integrity must be achieved solely through background color shifts. Use `surface-container-low` for a background area and `surface-container-lowest` (pure white) for the active content area. 

### Surface Hierarchy & Nesting
Treat the UI as a series of stacked, physical layers. 
- **Base Level:** `surface` (#f8f9ff)
- **Sectioning:** `surface-container-low` (#eff4ff)
- **Active Cards:** `surface-container-lowest` (#ffffff)
- **Pop-overs/Modals:** `surface-bright` (#f8f9ff) with backdrop-blur.

### The Glass & Gradient Rule
To prevent a "flat" academic feel, use the **Signature Texture**: 
- Main CTAs should utilize a subtle linear gradient (Top-Left to Bottom-Right) from `primary` (#00288e) to `primary_container` (#1e40af).
- For Students, use `secondary` (#006a61) to `secondary_container` (#86f2e4).
- Apply a `backdrop-blur` (12px - 20px) to navigation bars and floating chat panels using a semi-transparent `surface` color to create a "frosted glass" effect.

---

## 3. Typography: Editorial Authority
We utilize two distinct typefaces to separate "Action" from "Information."

- **The Display/Headline Face (Manrope):** This is our "Editorial" voice. Its geometric yet warm curves provide a high-end, modern academic feel. Use `display-lg` through `headline-sm` for page titles and section headers to establish an authoritative presence.
- **The Functional Face (Inter):** Used for `title`, `body`, and `label` roles. Inter is chosen for its mathematical precision and exceptional legibility in data-heavy management environments.

**Hierarchy Note:** Always pair a `headline-md` (Manrope) with a `body-md` (Inter) at a significantly lower opacity (using `on_surface_variant`) to create a sophisticated, high-contrast typographic stack.

---

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are banned in favor of **Tonal Layering**.

### The Layering Principle
Depth is achieved by "stacking" container tiers. A `surface-container-lowest` card placed on a `surface-container-low` background provides enough contrast for the human eye to perceive lift without the clutter of a shadow.

### Ambient Shadows
If an element *must* float (e.g., a modal or a primary action menu), use an **Ambient Shadow**:
- **Value:** `0px 20px 40px rgba(13, 28, 46, 0.06)`
- **Rule:** The shadow color must never be black; it must be a tinted version of `on_surface`.

### The Ghost Border Fallback
If accessibility requirements demand a border, use a **Ghost Border**:
- `outline_variant` (#c4c5d5) at **15% opacity**. This provides a hint of a boundary without breaking the "No-Line" rule.

---

## 5. Components: Precision & Clarity

### Cards (The "Atelier" Card)
- **Structure:** No borders. `lg` (0.5rem) or `xl` (0.75rem) corner radius.
- **Background:** `surface-container-lowest`.
- **Spacing:** Use 32px (2rem) internal padding to ensure "Academic Breathing Room."
- **Constraint:** Never use dividers between card items. Use vertical spacing (`24px`) or subtle background shifts to separate data points.

### Buttons (Signature CTAs)
- **Primary:** Gradient from `primary` to `primary_container`. White text. `full` roundedness for a friendly, modern feel.
- **Secondary (Student-focused):** `secondary_container` background with `on_secondary_container` text.
- **Tertiary:** No background. Bold `primary` text. Use for low-emphasis actions like "Cancel" or "View Details."

### Professional Data Tables
- **Header:** `surface-container-high` background, `label-md` uppercase typography.
- **Rows:** Alternating rows are forbidden. Use whitespace to define rows. On hover, transition the background to `surface-container-low`.
- **Lines:** Absolutely no vertical lines. Use a 1px `outline_variant` at 10% opacity for horizontal lines only if the data is extremely dense.

### Sleek Chat Interface
- **Bubbles:** Student messages use `secondary_fixed`. Teacher messages use `primary_fixed`.
- **The Glass Panel:** The chat container should use `surface_variant` with a 20px `backdrop-blur` and a `Ghost Border`. This makes the chat feel like an "overlay" on the productivity workspace rather than a blocked-off section.

---

## 6. Do’s and Don’ts

### Do:
*   **Do** embrace asymmetry. Align text to the left but allow imagery or data visualizations to bleed off the right edge of a container.
*   **Do** use `tertiary` (#611e00) sparingly for high-alert "Academic Warnings" or critical deadlines.
*   **Do** prioritize "Over-Spacing." If a layout feels crowded, double the white space before considering a divider line.

### Don't:
*   **Don't** use 100% black text. Always use `on_surface` (#0d1c2e) for better visual comfort during long study/management sessions.
*   **Don't** use "Standard Blue" links. Use `primary` for links and ensure they are paired with a 2px underline at 30% opacity.
*   **Don't** use sharp corners. Use `md` (0.375rem) as the absolute minimum for any interactive element to maintain the "Friendly & Modern" ethos.