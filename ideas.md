# TradeCore POS Dashboard — Design Direction

## Ground-Truth Reference Specification

The user-supplied TradeCore dashboard image is the visual source of truth. The implementation should preserve its pragmatic enterprise POS character: a deep forest-green navigational rail, a thin dark global header, a white-to-mist workspace, compact operational cards, amber chart accents, and a dense but readable multi-panel dashboard. The desktop view should echo the reference's information hierarchy while the mobile view should reflow the same business data into a deliberate, usable layout rather than shrink the desktop canvas.

## Chosen Approach: Retail Operations Ledger

### Design Movement

Contemporary enterprise software with **Swiss-inspired information hierarchy**. The interface favors explicit labels, repeatable operational patterns, and compact analytical surfaces over decorative spectacle.

### Core Principles

1. **Operational clarity first.** Every card, table, and action has a singular job and earns its place in the workflow.
2. **Dark-to-light framing.** The evergreen shell grounds the product; the pale workspace keeps heavy business data calm and scannable.
3. **Amber is semantic momentum.** It signals revenue, commercial attention, and primary chart activity; it never becomes background noise.
4. **Responsive continuity.** Mobile uses the same visual grammar, converting sidebar navigation into a drawer and multi-column data into stacked, horizontally-safe modules.

### Color Philosophy

The brand rests on an **ink-dark evergreen** foundation that conveys trust, inventory control, and permanence. A burnished **trade amber** creates emphasis for sales and primary actions, while a cool mist workspace and white cards make the metrics feel precise rather than stark. Green, blue, and amber data colors stay reserved for their distinct operational meanings.

### Layout Paradigm

A persistent left command rail and a narrow command bar frame an expansive operations canvas. The desktop dashboard alternates **two-by-two metric strips**, asymmetric chart panels, and full-width operational tables. On narrow screens, that canvas becomes a vertical operational briefing with chart cards retaining their visual order.

### Signature Elements

1. A **slender amber active-navigation rule** paired with a soft evergreen selected state.
2. **Ledger-like card headers** with uppercase micro-labels and small contextual actions.
3. A light **retail operations pattern** tucked into secondary regions, creating material depth without reducing legibility.

### Interaction Philosophy

Navigation should be fast, quiet, and dependable. Hover states lift only one or two pixels; buttons have crisp press feedback; controls expose clear focus rings. Data views support a compact mobile drawer rather than hiding core navigation.

### Animation

Interface motion is restrained and purposeful. The sidebar drawer enters on a 220ms ease-out curve, cards fade and rise by 4px in a short stagger on first load, and hover states use 160ms transitions. Motion is disabled or reduced where the user requests reduced motion.

### Typography System

**Manrope** handles UI labels, tables, and financial data because its compact open forms remain legible at small sizes. **DM Sans** carries section titles and KPI values, using strong semibold weights for confident commercial hierarchy. Numerical values use tabular figures to keep dashboards visually stable.

### Brand Essence

**TradeCore is the calm command center for fast-moving retail teams who need a clear view of every sale, payment, and stock signal.**

Personality: **grounded, exacting, commercial**.

### Brand Voice

Headlines state the operational truth directly; CTAs are action-led; microcopy explains the next decision without empty enthusiasm.

Examples:

> “Today’s trading, at a glance.”

> “Review the items that need a reorder.”

### Wordmark & Logo

The wordmark is a tight editorial pairing of **Trade** in off-white and **Core** in amber, anchored by a geometric storefront-arrow mark. The mark should work without the wordmark in the compact mobile header.

### Signature Brand Color

**Trade Amber — #F5B73A.**
