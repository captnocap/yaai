# Current Focus

> Started: 2026-01-02

## Image Generation - Quick Generate Panel

**Spec**: [spec-imagegen/SPEC_QUICK_GENERATE.md](../spec-imagegen/SPEC_QUICK_GENERATE.md)

Ad-hoc image generation without queue entries. Bottom bar component with prompt input, reference thumbnails, settings popover, and inline result preview.

### Tasks

- [ ] Create `QuickGenerateBar` component shell in `app/src/mainview/components/image-gen/`
- [ ] Add `ReferenceStrip` with thumbnail display and remove buttons
- [ ] Create `PromptInput` with auto-resize textarea
- [ ] Build `SettingsPopover` (model, resolution, aspect ratio, image count)
- [ ] Add `GenerateButton` with idle/loading/progress states
- [ ] Create `ResultPreview` panel with action buttons
- [ ] Wire to `useImageGen` hook and backend
- [ ] Add keyboard shortcuts (Ctrl+Enter, Ctrl+Shift+G)
- [ ] Implement prompt history with arrow key navigation

### Notes

- Reference existing `InputContainer` in `app/src/mainview/components/input/` for styling patterns
- Use `useImageGen` hook for backend communication
- Settings popover should include: Model selector, Resolution dropdown, Aspect ratio, Image count (1-4), Advanced options (steps, CFG, seed)
- Result preview actions: View Full, Use as Ref, Save Prompt, Add to Queue, Generate Again

### Key Files

- `app/src/mainview/components/image-gen/quick-generate/` (new directory)
- `app/src/mainview/hooks/useImageGen.ts` (existing)
- `app/src/bun/lib/image-gen/` (backend)

---

**Complete all tasks above before moving to next feature**
