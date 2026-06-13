// GPGPU simulation fragment shaders, as strings for GPUComputationRenderer.
// Two ping-pong textures: texturePosition and textureVelocity.
// `resolution` (uv grid size) is injected automatically by GPUComputationRenderer.

export const velocityShader = /* glsl */ `
  uniform sampler2D uTarget;   // baked target positions (xy), b = on-glyph flag
  uniform vec2  uMouse;        // world-space mouse
  uniform float uMouseRadius;
  uniform float uMouseForce;
  uniform float uStiffness;    // spring toward target
  uniform float uDamping;      // velocity damping
  uniform float uTime;

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;

    vec4 posData = texture2D( texturePosition, uv );
    vec4 velData = texture2D( textureVelocity, uv );
    vec4 tgt     = texture2D( uTarget, uv );

    vec3 pos = posData.xyz;
    vec3 vel = velData.xyz;
    vec3 target = vec3( tgt.xy, 0.0 );

    // spring toward target
    vec3 toTarget = target - pos;
    vel += toTarget * uStiffness;

    // mouse repulsion (in xy plane)
    vec2 fromMouse = pos.xy - uMouse;
    float d = length( fromMouse );
    if ( d < uMouseRadius && d > 0.0001 ) {
      float f = ( uMouseRadius - d ) / uMouseRadius;
      vel.xy += normalize( fromMouse ) * f * f * uMouseForce;
    }

    // gentle idle shimmer so the field never looks frozen
    float idle = 0.012;
    vel.x += sin( uTime * 1.3 + pos.y * 0.15 ) * idle * tgt.b;
    vel.y += cos( uTime * 1.1 + pos.x * 0.15 ) * idle * tgt.b;

    vel *= uDamping;

    gl_FragColor = vec4( vel, 1.0 );
  }
`;

export const positionShader = /* glsl */ `
  uniform float uDelta;

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 posData = texture2D( texturePosition, uv );
    vec4 velData = texture2D( textureVelocity, uv );

    vec3 pos = posData.xyz + velData.xyz * uDelta * 60.0;

    gl_FragColor = vec4( pos, 1.0 );
  }
`;
