# Michelangelo

**Live demo:** https://hwenchi.github.io/michelangelo/

## Rhetorical Design

### Purpose

There is an illusion at work in every GUI, and it operates on two levels. For users, what appears to be a persistent, manipulable object is a visual representation of something that lives in memory — invisible without the screen's intervention. For authors, components are a chunking device: draw calls, state, and behavior grouped into a unit the mind can reason about as one thing. This project demonstrates how that illusion of constancy is manufactured from drawing primitives.

### Strategy

The demo uses scrollable containers — both horizontal and vertical — as the primary vehicle. Scrolling produces two perceptual cues that together establish the sense of persistent objects. Motion: content responds to gesture, giving it the quality of occupying a place. Occlusion: elements disappear at the edge and return to where they were, which causes the visual system to infer they persisted rather than were destroyed and recreated. In reality, scrolling is an offset applied at compositing time — a different region of an offscreen texture is copied onto the display.

## Technical Challenges

### Picking

Because everything is flat pixels, there is no browser object to query for what is under the cursor. The framework walks the view tree top-down on each pointer event, testing bounding-box containment. The tree structure provides subtree pruning: when a container's frame does not contain the pointer, all descendants are skipped. Expected work is proportional to tree depth rather than total view count.