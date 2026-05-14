# Mermaid Node Device Slots Design

## Goal

Replace free-position sticker placement in the device desk with a Mermaid-node based placement flow.

## Design

The device desk keeps the Mermaid SVG as the primary flowchart view. After Mermaid finishes rendering, the frontend reads the rendered node elements, makes them clickable, and highlights the selected node. The right panel shows one device slot for the selected node. Students drag a device from the device library into that slot.

Each node has at most one device. Dropping a new device into an occupied selected-node slot replaces the previous device. The saved placement model is keyed by Mermaid node identity instead of visual coordinates:

- `node_id`: Mermaid node id such as `A`, `B`, or `D`
- `node_label`: rendered node label such as `MQTT网关`
- `sticker_id`: selected device id

The old free-position `x`, `y`, and `scale` fields remain in the database for compatibility, but the new UI ignores placements that do not have `node_id`. When the flowchart changes, existing placement clearing behavior remains in place.

## Testing

Frontend unit tests cover extracting stable node ids from Mermaid-rendered SVG ids and replacing node-slot placements. Backend route tests cover saving and loading node-based placements.
