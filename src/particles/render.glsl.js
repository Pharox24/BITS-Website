// Render shaders for the particle points. Reads simulated position from the
// GPGPU position texture via each particle's reference uv (a vertex attribute).

export const renderVertex = /* glsl */ `
  uniform sampler2D uPosition;
  uniform sampler2D uVelocity;
  uniform float uSize;
  uniform float uPixelRatio;

  attribute vec2 ref;       // this particle's texel coordinate
  attribute float seed;     // per-particle random 0..1

  varying float vSpeed;
  varying float vSeed;

  void main() {
    vec3 pos = texture2D( uPosition, ref ).xyz;
    vec3 vel = texture2D( uVelocity, ref ).xyz;
    vSpeed = length( vel );
    vSeed = seed;

    vec4 mvPosition = modelViewMatrix * vec4( pos, 1.0 );
    gl_Position = projectionMatrix * mvPosition;

    // size: base + a little boost while moving fast, attenuated by distance
    float size = uSize * ( 0.7 + seed * 0.6 ) * ( 1.0 + min( vSpeed * 1.5, 1.2 ) );
    gl_PointSize = size * uPixelRatio * ( 30.0 / -mvPosition.z );
  }
`;

export const renderFragment = /* glsl */ `
  uniform vec3 uColor;      // base fog color
  uniform vec3 uAccent;     // volt
  uniform vec3 uAccent2;    // volt-soft

  varying float vSpeed;
  varying float vSeed;

  void main() {
    // round, soft-edged point
    vec2 uv = gl_PointCoord - 0.5;
    float d = length( uv );
    float alpha = smoothstep( 0.5, 0.18, d );
    if ( alpha <= 0.01 ) discard;

    // color: mostly fog, a sprinkle of volt accents chosen by seed,
    // and a velocity-driven shift toward the accent while moving fast
    vec3 col = uColor;
    if ( vSeed > 0.93 ) col = uAccent;
    else if ( vSeed > 0.86 ) col = uAccent2;

    col = mix( col, uAccent2, clamp( vSpeed * 0.8, 0.0, 0.5 ) );

    gl_FragColor = vec4( col, alpha * ( 0.55 + vSeed * 0.45 ) );
  }
`;
