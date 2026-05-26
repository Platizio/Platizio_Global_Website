// Shared mutable globe state — NOT React state on purpose.
//
// cobe calls onRender at 60 fps and reads globeState.phi directly from
// this object (no re-renders needed).  The withRotate / withHover HOCs
// write to it.  The pin/callout positions are updated via DOM refs inside
// GlobeBase, again bypassing React's render cycle.
//
// This mirrors Framer's createStore pattern but without the Framer CDN
// dependency — it's a simple module-level singleton.

export interface GlobeStoreState {
  phi: number
  isHovering: boolean
  isDragging: boolean
}

export const globeState: GlobeStoreState = {
  phi: 77.2090 * (Math.PI / 180), // start centred on New Delhi longitude
  isHovering: false,
  isDragging: false,
}
