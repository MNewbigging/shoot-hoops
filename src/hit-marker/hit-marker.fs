
precision highp float;
precision highp int;

in vec2 vUv;
layout(location = 0) out vec4 pc_fragColor;

void main() {

  vec2 centredUv = vUv - 0.5;
  float radius = length(centredUv);

  if (radius > 0.38) discard;
  if (radius > 0.075 && radius < 0.33) discard;
 
  pc_fragColor = vec4(0.0, 0.0, 1.0, 0.75);
}