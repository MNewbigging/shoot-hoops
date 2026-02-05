import "./controls.scss";

export function Controls() {
  return (
    <div className="controls">
      <div>WASD - Move</div>
      <div>Mouse - Look</div>
      <div>LMB - Throw</div>
      <div>RMB - Pickup</div>
      <div>Wheel - Arc</div>
      <div>Tip: Hold LMB to charge</div>
    </div>
  );
}
