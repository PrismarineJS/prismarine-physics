# Door Passage & Collision Sliding Features

This document describes the new optional features added to prismarine-physics for enhanced door navigation and collision handling.

## Features

### 1. Open Door Passage (`allowOpenDoorPassage`)

When enabled, allows entities to move through open doors instead of treating them as solid blocks.

**Default:** `false` (maintains backward compatibility)

#### Usage
```javascript
const physics = Physics(mcData, world, {
  allowOpenDoorPassage: true
})
```

#### Behavior
- **Closed doors:** Always block movement (unchanged)
- **Open doors:** Allow movement when feature is enabled
- **All door types supported:** Oak, Spruce, Birch, Jungle, Acacia, Dark Oak, Crimson, Warped, Mangrove, Cherry, Bamboo, and Copper doors

### 2. Collision Sliding (`enableCollisionSliding`)

Prepares the framework for enhanced collision sliding behavior along X and Z axes.

**Default:** `false` (placeholder for future implementation)

#### Usage
```javascript
const physics = Physics(mcData, world, {
  enableCollisionSliding: true
})
```

#### Current Status
- Framework is in place with collision detection hooks
- Actual sliding logic is TODO for future implementation
- No breaking changes to existing collision behavior

## Backward Compatibility

Both features are **opt-in** with `false` defaults, ensuring:
- Existing bots continue working unchanged
- No breaking changes to current behavior
- Gradual adoption possible

## Implementation Details

### Door Detection
Uses block type IDs instead of string matching for reliability:
```javascript
const doorBlockIds = new Set([
  blocksByName.oak_door?.id,
  blocksByName.spruce_door?.id,
  // ... all door variants
].filter(id => id !== undefined))
```

### Collision Check
```javascript
// Only skip door collisions if feature is enabled and door is open
if (physics.config.allowOpenDoorPassage && doorBlockIds.has(block.type) && block.isOpen) {
  continue
}
```

## Examples

### Basic Usage (Backward Compatible)
```javascript
const physics = Physics(mcData, world)
// Doors always block movement (existing behavior)
```

### Enable Door Passage
```javascript
const physics = Physics(mcData, world, {
  allowOpenDoorPassage: true
})
// Open doors allow movement, closed doors still block
```

### Enable Both Features
```javascript
const physics = Physics(mcData, world, {
  allowOpenDoorPassage: true,
  enableCollisionSliding: true
})
```

## Testing

Comprehensive test suite included:
- Backward compatibility verification
- Open/closed door behavior
- Multiple door type support
- Feature flag functionality

Run tests with:
```bash
npm test
```

## Migration Guide

### For Bot Developers
No changes required - existing code continues to work unchanged.

### To Enable New Features
Simply add the options parameter when creating physics instance:
```javascript
// Before
const physics = Physics(mcData, world)

// After (with new features)
const physics = Physics(mcData, world, {
  allowOpenDoorPassage: true
})
```

## Considerations

### Performance
- Minimal performance impact when features are disabled
- Door type detection is cached at initialization
- Feature flags checked only during collision detection

### Compatibility
- Requires `block.isOpen` property from world provider (e.g., mineflayer)
- Graceful fallback if property is missing (treats as closed)
- Works across all Minecraft versions with door support
