// src/data/anatomyLabels.ts
// Static lookup: mesh/group name → display label
// Covers procedural skeleton groups + bundled GLB mesh names

export type AnatomyLabel = { name: string; description: string };

export const anatomyLabels: Record<string, AnatomyLabel> = {
  // Procedural skeleton named groups (SkeletonPreview.tsx)
  skull:       { name: 'Skull',      description: 'Bony structure encasing and protecting the brain.' },
  spine:       { name: 'Spine',      description: 'Vertebral column supporting the trunk and protecting the spinal cord.' },
  ribcage:     { name: 'Ribcage',    description: 'Twelve pairs of ribs protecting the heart and lungs.' },
  pelvis:      { name: 'Pelvis',     description: 'Basin-shaped bone supporting the spine and carrying the lower limbs.' },
  'left-arm':  { name: 'Left Arm',   description: 'Upper limb comprising humerus, radius, and ulna.' },
  'right-arm': { name: 'Right Arm',  description: 'Upper limb comprising humerus, radius, and ulna.' },
  'left-leg':  { name: 'Left Leg',   description: 'Lower limb comprising femur, tibia, and fibula.' },
  'right-leg': { name: 'Right Leg',  description: 'Lower limb comprising femur, tibia, and fibula.' },
  // Bundled GLB mesh names
  Proxy:        { name: 'Human Body', description: 'Full body anatomical model.' },
  SkeletonMesh: { name: 'Skeleton',   description: 'Full skeletal structure.' },
};
