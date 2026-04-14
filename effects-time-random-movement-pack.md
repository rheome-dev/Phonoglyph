This file is a merged representation of a subset of the codebase, containing specifically included files, combined into a single document by Repomix.

# File Summary

## Purpose
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: extracted/stylize/grain, extracted/stylize/glitch, extracted/stylize/dither, extracted/stylize/crt, extracted/stylize/chromaticAbberation, extracted/misc/wisps, extracted/misc/replicate, extracted/misc/pattern, extracted/misc/noiseFill, extracted/misc/gradientFill, extracted/misc/glitter, extracted/distort/waves, extracted/distort/waterRipples, extracted/distort/swirl, extracted/distort/skybox, extracted/distort/sineWaves, extracted/distort/shatter, extracted/distort/ripple, extracted/distort/polar, extracted/distort/noise, extracted/distort/liquify, extracted/distort/flowfield, extracted/distort/fbm, extracted/light/waterCaustics, extracted/light/lightTrail, extracted/light/beam, extracted/light/aurora, extracted/light/2DLight, extracted/blur/noiseBlur, extracted/blur/fog, extracted/blur/diffusion
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
extracted/
  blur/
    diffusion
    fog
    noiseBlur
  distort/
    fbm
    flowfield
    liquify
    noise
    polar
    ripple
    shatter
    sineWaves
    skybox
    swirl
    waterRipples
    waves
  light/
    2DLight
    aurora
    beam
    lightTrail
    waterCaustics
  misc/
    glitter
    gradientFill
    noiseFill
    pattern
    replicate
    wisps
  stylize/
    chromaticAbberation
    crt
    dither
    glitch
    grain
```

# Files

## File: extracted/blur/diffusion
```
// This shader implements a Diffusion Blur effect, also known as a Random Sampling Blur or Kuwahara Filter approximation due to its use of randomized offsets, often employed for effects like depth of field or heat shimmer. It averages multiple texture samples taken at random positions around the current fragment, weighted by a variable amount.

// I have formatted the single fragment shader and the shared vertex shader below.

// 1. Vertex Shader (Shared)
// OpenGL Shading Language

#version 300 es
precision mediump float;

// Attributes
in vec3 aVertexPosition;
in vec2 aTextureCoord;

// Uniforms
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat4 uTextureMatrix;

// Outputs
out vec2 vTextureCoord;
out vec3 vVertexPosition;

void main() {
    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
    vTextureCoord = (uTextureMatrix * vec4(aTextureCoord, 0.0, 1.0)).xy;
}

// 2. Fragment Shader (Diffusion Pass)
// OpenGL Shading Language

#version 300 es
precision highp float;
precision highp int;

// Inputs
in vec2 vTextureCoord;

// Uniforms
uniform sampler2D uTexture;
uniform float uTime;
uniform vec2 uMousePos;
uniform vec2 uResolution;

// Constants
const float MAX_ITERATIONS = 24.;
const float PI = 3.14159265;
const float TWOPI = 6.2831853;

// Output
out vec4 fragColor;

// --- Utility Functions ---

float ease (int easingFunc, float t) {
    return t; // Currently a linear ease function
}

// PCG (Permuted Congruential Generator) for random number generation
uvec2 pcg2d(uvec2 v) {
    v = v * 1664525u + 1013904223u;
    v.x += v.y * v.y * 1664525u + 1013904223u;
    v.y += v.x * v.x * 1664525u + 1013904223u;
    v ^= v >> 16;
    v.x += v.y * v.y * 1664525u + 1013904223u;
    v.y += v.x * v.x * 1664525u + 1013904223u;
    return v;
}

// Random float generator using PCG
float randFibo(vec2 p) {
    uvec2 v = floatBitsToUint(p);
    v = pcg2d(v);
    uint r = v.x ^ v.y;
    return float(r) / float(0xffffffffu);
}

void main() {
    vec2 uv = vTextureCoord;
    float aspectRatio = uResolution.x / uResolution.y;
    
    // Time-based offset for randomization (changes every 20 frames/seconds of uTime)
    float delta = fract(floor(uTime) / 20.); 
    
    // --- Blur Masking and Amount Calculation ---
    
    // Initial blur amount
    float amount = 0.2500 * 2.; 
    
    // Mouse position is used for the center of focus (0.0000 disables mouse interaction)
    vec2 mPos = vec2(0.5, 0.5) + mix(vec2(0), (uMousePos - 0.5), 0.0000);

    // Calculate normalized distance from the focus point (mPos)
    // The multiplier '4. * (1. - 1.0000)' is zero, making dist effectively max(0., 1. - 0.) = 1.
    float dist = ease(0, max(0., 1. - distance(uv * vec2(aspectRatio, 1), mPos * vec2(aspectRatio, 1)) * 4. * (1. - 1.0000)));

    // Scale the base amount by the distance (dist=1, so amount is unchanged)
    amount *= dist; 
    
    // --- Diffusion Logic ---
    
    vec4 col;
    if (amount <= 0.001) {
        // If blur amount is negligible, return the original pixel color
        col = texture(uTexture, uv);
    } else {
        vec4 result = vec4(0);
        
        // Threshold for adaptive sampling (0.5000 is likely a uniform for strength/density)
        float threshold = max(1. - 0.5000, 2. / MAX_ITERATIONS);
        const float invMaxIterations = 1.0 / float(MAX_ITERATIONS);
        
        // Base direction vector for random sampling offsets.
        // The Y component is scaled by 'aspectRatio' in the sample loop direction adjustment.
        // Note: The X/Y direction mix (0.5000 / aspectRatio, 1.-0.5000) seems to define an elliptical distribution.
        vec2 dir = vec2(0.5000 / aspectRatio, 1. - 0.5000) * amount * 0.4;
        
        float iterations = 0.0;
        
        for (float i = 1.; i <= MAX_ITERATIONS; i++) {
            float th = i * invMaxIterations;
            
            // Adaptive sampling: stop if we exceed the threshold
            if (th > threshold) break;
            
            // Generate three independent random numbers based on current position and iteration
            float random1 = randFibo(uv + th + delta);
            float random2 = randFibo(uv + th * 2. + delta);
            float random3 = randFibo(uv + th * 3. + delta);
            
            // Create a random point in a circle/ellipse:
            // (random1 * 2. - 1.) gives [-1, 1]. This is mixed with random3 to slightly weight towards the center (0.8 mix factor).
            vec2 ranPoint = vec2(random1 * 2. - 1., random2 * 2. - 1.) * mix(1., random3, 0.8);
            
            // Sample the texture using the randomized offset scaled by 'dir'
            result += texture(uTexture, uv + ranPoint * dir);
            iterations += 1.0;
        }
        
        // Average the accumulated samples
        result /= max(1.0, iterations);
        col = result;
    }
    
    fragColor = col;
}
// Summary of Diffusion Technique
// This shader uses a Monte Carlo approach to blurring. Instead of sampling a fixed, symmetrical Gaussian kernel, it samples up to 24 random points around the current pixel, constrained by the dir vector, and averages them.

// The key features are:

// Randomized Samples: Uses randFibo (a high-quality pseudorandom generator) to pick random offsets.

// Adaptive Iteration: The threshold logic attempts to stop the loop early if the required blur intensity is met, saving performance.

// Non-Locality: The random sampling helps create a smoother, less blocky blur than a standard box filter and is great for reproducing effects like the Bokeh shimmer seen in the previous shader, but in a less structured, more computationally expensive way.
```

## File: extracted/blur/fog
```
// This shader implements a Noise-Driven Fog and Post-Processing effect. It consists of four passes: three blur passes (0, 1, 2) to generate a blurred image based on noise, and one final pass (4) to composite the fog effect, apply chromatic aberration, tonemapping, and grain.

// The blur passes are a form of a Separable Gaussian/Exponential blur, where the radius is modulated by animated noise.

// 1. Vertex Shader (Shared)
// OpenGL Shading Language

#version 300 es
precision mediump float;

// Attributes
in vec3 aVertexPosition;
in vec2 aTextureCoord;

// Uniforms
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat4 uTextureMatrix;

// Outputs
out vec2 vTextureCoord;
out vec3 vVertexPosition;

void main() {
    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
    vTextureCoord = (uTextureMatrix * vec4(aTextureCoord, 0.0, 1.0)).xy;
}
// 2. Fragment Shaders (Blur Passes 0, 1, 2)
// These three passes perform a 1D exponential blur (with an extra scatter tap) in three different directions (Horizontal, Vertical, and Diagonal), using a noise function (fnoise) to determine the blur radius.

// Shared Helper Functions
// OpenGL Shading Language

// --- Shared Utility Functions ---

float ease (int easingFunc, float t) {
    return t; // Linear ease
}

// Exponential Weights for 1D kernel (0 is center, 1-8 are offsets)
float getExponentialWeight(int index) {
    switch(index) {
        case 0: return 1.0000000000;
        case 1: return 0.7165313106;
        case 2: return 0.5134171190;
        case 3: return 0.3678794412;
        case 4: return 0.2636050919;
        case 5: return 0.1888756057;
        case 6: return 0.1353352832;
        case 7: return 0.0969670595;
        case 8: return 0.0694877157;
        default: return 0.0;
    }
}

mat2 rot(float a) {
    return mat2(cos(a), -sin(a), sin(a), cos(a));
}

const float PHI = 1.618033988;
const float PI = 3.14159265359;

// Noise function based on the Golden Ratio (PHI) and cosine/sine modulation
float dot_noise(vec3 p) {
    const mat3 GOLD = mat3(
        -0.571464913, +0.814921382, +0.096597072,
        -0.278044873, -0.303026659, +0.911518454,
        +0.772087367, +0.494042493, +0.399753815);
    return dot(cos(GOLD * p), sin(PHI * p * GOLD));
}

// Fractional Brownian Motion (FBM) with rotation and flow
float cheap_fbm(vec3 p) {
    mat2 rota = mat2(0.6, -0.8, 0.8, 0.6);
    float nos = 0.;
    float amp = 1. + 0.5000 * 10.;
    float xp = sqrt(2.);
    float halfxp = xp * 0.5;
    
    for(int i = 0; i < 6; i++) {
        float theta = uTime * 0.05 + float(i);
        p.xy *= xp;
        p.xy += sin(rota * p.xy * xp + theta) * 0.2;
        float nz = dot_noise(vec3(p.xy * rota, p.z + theta));
        nos += nz * amp * rota[0][0];
        amp *= halfxp;
        rota *= mat2(0.6, -0.8, 0.8, 0.6);
    }
    
    nos *= 1. / float(6);
    float density = -3. + 0.5000 * 6.;
    return smoothstep(-3., 3., nos + density); // Density adjustment
}

// Noise masking function
float fnoise(vec2 uv) {
    float aspectRatio = uResolution.x / uResolution.y;
    vec2 aspect = vec2(aspectRatio, 1);
    
    float multiplier = 10.0 * (0.5000 / ((aspectRatio + 1.) / 2.));
    vec2 st = ((uv * aspect - vec2(0.5, 0.5) * aspect)) * multiplier * rot((0.0000 - 0.125) * 2. * PI);
    
    // Mouse interaction is disabled (0.0000)
    vec2 mPos = vec2(0.5, 0.5) + mix(vec2(0), (uMousePos - 0.5), 0.0000);
    
    // Distance mask (disabled as 1. - 1.0000 = 0)
    float dist = ease(0, max(0., 1. - distance(uv * aspect, mPos * aspect) * 4. * (1. - 1.0000)));
    // if (0 == 1) { dist = max(0., (0.5 - dist)); } // Optional masking logic

    float time = uTime * 0.05;
    vec2 drift = vec2(time * 0.2) * 2.0 * 0.5000;
    
    float fbm = cheap_fbm(vec3(st - drift, time)) * dist;
    fbm = fbm / (1. + fbm); // Compression/toning
    return fbm;
}

// Exponential Blur with Noise-Modulated Radius
vec4 ExponentialBlur(sampler2D tex, vec2 uv, vec2 direction) {
    vec4 color = vec4(0.0);
    float total_weight = 0.0;
    
    // Get noise value to determine blur radius
    float fogNoise = fnoise(uv);
    float radius = 8.0 * fogNoise * max(0.5000, 0.1);
    radius = mix(0.01, 0.03, radius); // Lerp between minimum and maximum radius
    
    // Normalize and aspect-ratio correct the direction vector
    vec2 dir = normalize(direction) / vec2(uResolution.x / uResolution.y, 1);
    
    // Center Sample (Index 0)
    vec4 center = texture(tex, uv);
    float center_weight = getExponentialWeight(0);
    color += center * center_weight;
    total_weight += center_weight;
    
    // Symmetric Sampling (16 taps)
    for (int i = 1; i <= 8; i++) {
        float weight = getExponentialWeight(i);
        float offset = radius * float(i) / 8.0;
        
        vec4 sample1 = texture(tex, uv + offset * dir);
        vec4 sample2 = texture(tex, uv - offset * dir);
        
        color += (sample1 + sample2) * weight;
        total_weight += 2.0 * weight;
    }
    
    // Extra Scatter Sample (fixed weight 0.0694877157, which is the weight for index 8)
    float scatter = radius * 2.;
    color += (
        texture(tex, uv + scatter * dir) +
        texture(tex, uv - scatter * dir)
    ) * 0.0694877157;
    
    return color / total_weight;
}
// Fragment Shader 0 (Blur X)
// OpenGL Shading Language

// ... (Shared uniforms, functions, and constants) ...

vec4 getColor(vec2 uv) {
    return blur(uv, vec2(1, 0)); // Blur in X direction
}

void main() {
    vec2 uv = vTextureCoord;
    vec4 color = getColor(uv);
    fragColor = color;
}
// Fragment Shader 1 (Blur Y)
// OpenGL Shading Language

// ... (Shared uniforms, functions, and constants) ...

vec4 getColor(vec2 uv) {
    return blur(uv, vec2(0, 1)); // Blur in Y direction
}

void main() {
    vec2 uv = vTextureCoord;
    vec4 color = getColor(uv);
    fragColor = fragColor;
}
// Fragment Shader 2 (Blur Diagonal)
// OpenGL Shading Language

// ... (Shared uniforms, functions, and constants) ...

vec4 getColor(vec2 uv) {
    return blur(uv, vec2(1, 1)); // Blur in Diagonal direction
}

void main() {
    vec2 uv = vTextureCoord;
    vec4 color = getColor(uv);
    fragColor = color;
}
// 3. Fragment Shader (Final Composite Pass 4)
// This pass takes the result of the noise-based blur (uTexture) and the original image (uBgTexture), and combines them with additional post-processing effects like Chromatic Aberration, Tonemapping, and Film Grain.

// OpenGL Shading Language

#version 300 es
precision highp float;
precision highp int;

// Inputs
in vec3 vVertexPosition;
in vec2 vTextureCoord;

// Uniforms
uniform sampler2D uTexture;     // Blurred image (from previous passes)
uniform sampler2D uBgTexture;   // Original/unblurred image
uniform float uTime;
uniform vec2 uMousePos;
uniform vec2 uResolution;

// Output
out vec4 fragColor;

// ... (Includes ease, pcg2d, randFibo, rot, PHI, PI, dot_noise, cheap_fbm, fnoise functions/constants) ...

// ACES Tonemapping function
vec3 Tonemap_ACES(vec3 x) {
    const float a = 2.51;
    const float b = 0.03;
    const float c = 2.43;
    const float d = 0.59;
    const float e = 0.14;
    return (x * (a * x + b)) / (x * (c * x + d) + e);
}

// Chromatic Aberration applied radially outwards
vec3 chromatic_aberration(vec3 color, vec2 uv, float amount) {
    // Offset direction is normalized vector from center (0.5) to UV
    vec2 offset = normalize(vTextureCoord - 0.5) * amount / vec2(uResolution.x / uResolution.y, 1);
    
    // Sample Red channel slightly inward, Blue channel slightly outward
    vec4 left = texture(uTexture, uv - offset);
    vec4 right = texture(uTexture, uv + offset);
    
    color.r = left.r;
    color.b = right.b;
    
    return color;
}

// Composite Fog effect
vec4 fogComposite(vec2 uv) {
    vec4 bg = texture(uBgTexture, uv);
    vec4 blur = texture(uTexture, uv);
    float aspectRatio = uResolution.x / uResolution.y;
    
    // Get noise mask and scale it
    float fogNoise = fnoise(uv);
    float fogMask = clamp(fogNoise * 2., 0., 1.); // Mask strength from noise
    
    // Generate simple film grain (using randFibo which is included in the full script)
    vec3 grain = vec3(randFibo(uv + fogNoise));

    // 1. Apply Chromatic Aberration
    // CA amount is scaled by the fog mask
    blur.rgb = chromatic_aberration(blur.rgb, uv, fogMask * 0.01 * 0.5000 * (0.5000 * 2.5));
    
    // 2. Apply Tonemapping and Grain
    blur.rgb = Tonemap_ACES(blur.rgb * (0.5000 + 0.5)) + grain * 0.05;
    
    vec4 foggedBlur = vec4(blur.rgb * vec3(1, 1, 1), blur.a);
    
    // 3. Add Fog Color/Density (white fog)
    // 0.1000 * 0.25 is the base fog density, multiplied by the mask
    foggedBlur.rgb += (0.1000 * 0.25 * fogMask * vec3(1, 1, 1));
    
    // 4. Final Mix: blend the original image (bg) with the fogged and blurred image
    foggedBlur = mix(bg, foggedBlur, fogMask);
    
    return foggedBlur;
}

vec4 getColor(vec2 uv) {
    return fogComposite(uv);
}

void main() {
    vec2 uv = vTextureCoord;
    vec4 color = getColor(uv);
    fragColor = color;
}
```

## File: extracted/blur/noiseBlur
```
// This set of shaders implements a Noise-Based Directional Blur, where the blur direction and magnitude are modulated per-pixel by a 3D Body-Centered Cubic (BCC) Noise function. This creates an organic, flowing, or "heat shimmer" effect.

// Since both fragment shaders (0 and 1) are identical, I will format the shared vertex shader and the single unique fragment shader logic.

// 1. Vertex Shader (Shared)
// OpenGL Shading Language

#version 300 es
precision mediump float;

// Attributes
in vec3 aVertexPosition;
in vec2 aTextureCoord;

// Uniforms
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat4 uTextureMatrix;

// Outputs
out vec2 vTextureCoord;
out vec3 vVertexPosition;

void main() {
    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
    vTextureCoord = (uTextureMatrix * vec4(aTextureCoord, 0.0, 1.0)).xy;
}
// 2. Fragment Shader (Noise Blur Pass)
// OpenGL Shading Language

// #version 300 es
precision highp float;

// Inputs
in vec2 vTextureCoord;

// Uniforms
uniform sampler2D uTexture;
uniform float uTime;
uniform vec2 uResolution;

// Output
out vec4 fragColor;

// Constants
const float PI = 3.14159265;
const int MAX_ITERATIONS = 32;
const float MAX_ITERATIONS_F = 32.0;
const float HALF_ITERATIONS = 16.0;

// --- Noise Implementation (Body-Centered Cubic Noise) ---

vec4 permute(vec4 t) {
    return t * (t * 34.0 + 133.0);
}

// Gradient generation function for BCC Noise
vec3 grad(float hash) {
    // ... (Detailed gradient calculation logic) ...
    vec3 cube = mod(floor(hash / vec3(1.0, 2.0, 4.0)), 2.0) * 2.0 - 1.0;
    vec3 cuboct = cube;
    float index0 = step(0.0, 1.0 - floor(hash / 16.0));
    float index1 = step(0.0, floor(hash / 16.0) - 1.0);
    cuboct.x *= 1.0 - index0;
    cuboct.y *= 1.0 - index1;
    cuboct.z *= 1.0 - (1.0 - index0 - index1);
    float type = mod(floor(hash / 8.0), 2.0);
    vec3 rhomb = (1.0 - type) * cube + type * (cuboct + cross(cube, cuboct));
    vec3 grad = cuboct * 1.22474487139 + rhomb;
    grad *= (1.0 - 0.042942436724648037 * type) * 3.5946317686139184;
    return grad;
}

// BCC Noise derivatives calculation part
vec4 bccNoiseDerivativesPart(vec3 X) {
    // ... (Detailed BCC noise calculation, sampling four closest cells) ...
    vec3 b = floor(X);
    vec4 i4 = vec4(X - b, 2.5);
    vec3 v1 = b + floor(dot(i4, vec4(.25)));
    // ... v2, v3, v4 calculation ...
    
    // Hashing and Permutation
    vec4 hashes = permute(mod(vec4(v1.x, v2.x, v3.x, v4.x), 289.0));
    hashes = permute(mod(hashes + vec4(v1.y, v2.y, v3.y, v4.y), 289.0));
    hashes = mod(permute(mod(hashes + vec4(v1.z, v2.z, v3.z, v4.z), 289.0)), 48.0);
    
    // Distance vectors
    vec3 d1 = X - v1; vec3 d2 = X - v2; vec3 d3 = X - v3; vec3 d4 = X - v4;
    
    // Attenuation function
    vec4 a = max(0.75 - vec4(dot(d1, d1), dot(d2, d2), dot(d3, d3), dot(d4, d4)), 0.0);
    vec4 aa = a * a; vec4 aaaa = aa * aa;
    
    // Gradients
    vec3 g1 = grad(hashes.x); vec3 g2 = grad(hashes.y);
    vec3 g3 = grad(hashes.z); vec3 g4 = grad(hashes.w);
    
    // Extrapolations (dot product of distance and gradient)
    vec4 extrapolations = vec4(dot(d1, g1), dot(d2, g2), dot(d3, g3), dot(d4, g4));
    
    // Combined derivative calculation
    vec3 derivative = -8.0 * mat4x3(d1, d2, d3, d4) * (aa * a * extrapolations)
    + mat4x3(g1, g2, g3, g4) * aaaa;
    
    // Returns (dF/dx, dF/dy, dF/dz, F)
    return vec4(derivative, dot(aaaa, extrapolations));
}

// BCC Noise derivatives entry point
vec4 bccNoiseDerivatives_XYBeforeZ(vec3 X) {
    // Orthonormal map (shear/rotation) to transform input coordinates
    mat3 orthonormalMap = mat3(
        0.788675134594813, -0.211324865405187, -0.577350269189626,
        -0.211324865405187, 0.788675134594813, -0.577350269189626,
        0.577350269189626, 0.577350269189626, 0.577350269189626);
    
    X = orthonormalMap * X;
    
    // Combine two noise parts (for symmetry/better tiling)
    vec4 result = bccNoiseDerivativesPart(X) + bccNoiseDerivativesPart(X + 144.5);
    
    // Rotate derivatives back into original space and return (dF/dx, dF/dy, dF/dz, F)
    return vec4(result.xyz * orthonormalMap, result.w);
}

// 2D Rotation Matrix
mat2 rot(float a) {
    return mat2(cos(a), -sin(a), sin(a), cos(a));
}

void main() {
    vec2 uv = vTextureCoord;
    float aspectRatio = uResolution.x / uResolution.y;

    // 1. Calculate 3D Noise Coordinates (XY spatial, Z temporal)
    
    // Calculate UV relative to center, scaled by aspect ratio
    vec2 centeredUv = uv * vec2(aspectRatio, 1.) - vec2(0.5, 0.5) * vec2(aspectRatio, 1.);
    
    // Scale the UV space. Rotation is disabled (0.0000). Scaling is anisotropic (0.5000 / 1.-0.5000)
    vec2 noiseUv = rot(0.0000 * -1. * 2.0 * PI) * centeredUv * vec2(0.5000, 1. - 0.5000) * 5. * 0.2500;
    
    // Z coordinate provides animation over time (uTime * 0.025)
    vec4 noise = bccNoiseDerivatives_XYBeforeZ(vec3(noiseUv, uTime * 0.025 + 0.0000 * 2.));
    
    // 2. Determine Blur Offset
    
    // Use the noise derivatives (noise.xy) for the offset direction. 
    // The derivatives represent the local direction of change/gradient.
    // The noise value (range approx -0.5 to 0.5) is scaled by uniforms (0.2500, 0.01)
    vec2 noiseOffset = (noise.xy - 0.5) * (0.2500 + 0.01) * 0.25;

    // 3. Perform Sampling (1D linear blur along the noise gradient)
    
    vec4 color = vec4(0.0);
    
    // Iterate 32 times, sampling both positive and negative directions
    for (int i = 0; i < MAX_ITERATIONS; i++) {
        float offset = float(i) - HALF_ITERATIONS; // Offset ranges from -15 to 16
        
        // Calculate sampling coordinate: current UV + (noise direction * normalized step distance)
        vec2 st = uv + noiseOffset * (offset / MAX_ITERATIONS_F);
        
        color += texture(uTexture, st);
    }

    // Average the samples
    color /= MAX_ITERATIONS_F;
    fragColor = color;
}
// Summary of Noise Blur
// This shader creates a non-uniform blur effect by:

// Generating 3D Noise: It uses a high-quality 3D BCC noise function, where the Z-dimension is driven by time, making the pattern animate.

// Determining Direction: The gradient (or derivatives, noise.xy) of the 3D noise is used to define the direction of the blur at each pixel.

// 1D Sampling: It performs a 32-tap linear blur along the calculated, per-pixel direction.

// This results in a sophisticated effect often used to simulate water distortions, heat waves, or subtle atmospheric turbulence.
```

## File: extracted/distort/fbm
```
// 1. Vertex Shader
// Standard pass-through shader handling position and texture coordinates.

// OpenGL Shading Language

#version 300 es
precision mediump float;

// Attributes
in vec3 aVertexPosition;
in vec2 aTextureCoord;

// Uniforms
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat4 uTextureMatrix;

// Outputs
out vec2 vTextureCoord;
out vec3 vVertexPosition;

void main() {
    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
    vTextureCoord = (uTextureMatrix * vec4(aTextureCoord, 0.0, 1.0)).xy;
}

// 2. Fragment Shader
// This shader uses Domain Warping. It calculates Perlin noise, then feeds that noise back into the FBM function to create a fluid, marble-like distortion effect.

// OpenGL Shading Language

#version 300 es
precision highp float;

// Inputs
in vec2 vTextureCoord;

// Uniforms
uniform sampler2D uTexture;
uniform float uTime;
uniform vec2 uMousePos;
uniform vec2 uResolution;

// Output
out vec4 fragColor;

// --- Helper Functions ---

float ease(int easingFunc, float t) {
    return t;
}

// Random Number Generator for Noise
vec3 hash33(vec3 p3) {
    p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));
    p3 += dot(p3, p3.yxz + 19.19);
    return -1.0 + 2.0 * fract(vec3(
        (p3.x + p3.y) * p3.z,
        (p3.x + p3.z) * p3.y,
        (p3.y + p3.z) * p3.x
    ));
}

// 3D Perlin Noise
float perlin_noise(vec3 p) {
    vec3 pi = floor(p);
    vec3 pf = p - pi;
    
    // Quintic interpolation curve
    vec3 w = pf * pf * (3.0 - 2.0 * pf);
    
    // Gradients
    float n000 = dot(pf - vec3(0.0, 0.0, 0.0), hash33(pi + vec3(0.0, 0.0, 0.0)));
    float n100 = dot(pf - vec3(1.0, 0.0, 0.0), hash33(pi + vec3(1.0, 0.0, 0.0)));
    float n010 = dot(pf - vec3(0.0, 1.0, 0.0), hash33(pi + vec3(0.0, 1.0, 0.0)));
    float n110 = dot(pf - vec3(1.0, 1.0, 0.0), hash33(pi + vec3(1.0, 1.0, 0.0)));
    float n001 = dot(pf - vec3(0.0, 0.0, 1.0), hash33(pi + vec3(0.0, 0.0, 1.0)));
    float n101 = dot(pf - vec3(1.0, 0.0, 1.0), hash33(pi + vec3(1.0, 0.0, 1.0)));
    float n011 = dot(pf - vec3(0.0, 1.0, 1.0), hash33(pi + vec3(0.0, 1.0, 1.0)));
    float n111 = dot(pf - vec3(1.0, 1.0, 1.0), hash33(pi + vec3(1.0, 1.0, 1.0)));
    
    // Interpolation (Trilinear)
    float nx00 = mix(n000, n100, w.x);
    float nx01 = mix(n001, n101, w.x);
    float nx10 = mix(n010, n110, w.x);
    float nx11 = mix(n011, n111, w.x);
    
    float nxy0 = mix(nx00, nx10, w.y);
    float nxy1 = mix(nx01, nx11, w.y);
    
    float nxyz = mix(nxy0, nxy1, w.z);
    
    return nxyz;
}

const float PI = 3.14159265359;

mat2 rot(float a) {
    return mat2(cos(a), -sin(a), sin(a), cos(a));
}

mat2 rotHalf = mat2(
     cos(0.5), sin(0.5),
    -sin(0.5), cos(0.5)
);

// Fractal Brownian Motion
float fbm(in vec3 st) {
    float value = 0.0;
    float amp = .25;
    float frequency = 0.;
    float aM = (0.1 + 0.9200 * .65);
    vec2 shift = vec2(100.0);
    
    // Iterate 3 octaves
    for (int i = 0; i < 3; i++) {
        value += amp * perlin_noise(st);
        st.xy *= rotHalf * 2.5;
        st.xy += shift;
        amp *= aM;
    }
    return value;
}

// --- Main ---

void main() {
    vec2 uv = vTextureCoord;
    float aspectRatio = uResolution.x / uResolution.y;
    float multiplier = 6.0 * (0.4000 / ((aspectRatio + 1.) / 2.));
    
    // Mouse Interaction
    vec2 mPos = vec2(0.5, 0.5) + mix(vec2(0), (uMousePos - 0.5), 0.0000);
    vec2 pos = mix(vec2(0.5, 0.5), mPos, floor(1.0000));
    
    // Effect Mask (Distance from mouse/center)
    float mDist = ease(0, max(0., 1. - distance(uv * vec2(aspectRatio, 1), mPos * vec2(aspectRatio, 1)) * 4. * (1. - 1.0000)));
    
    // Coordinate Setup
    vec2 skew = mix(vec2(1), vec2(1, 0), 0.0000);
    vec2 st = ((uv - pos) * vec2(aspectRatio, 1)) * multiplier * aspectRatio;
    st = rot(0.0000 * -2. * PI) * st * skew;
    
    vec2 drift = vec2(0, uTime * 0.005) * (0.5000 * 2.);
    float time = uTime * 0.025;
    
    // --- Domain Warping Logic ---
    // 1. Calculate base noise vector `r`
    vec2 r = vec2(
        fbm(vec3(st - drift + vec2(1.7, 9.2), 0.0000 * 25. + time)),
        fbm(vec3(st - drift + vec2(8.2, 1.3), 0.0000 * 25. + time))
    );
    
    // 2. Calculate secondary noise `f` using `r` to distort the domain
    float f = fbm(vec3(st + r - drift, 0.0000 * 25. + time)) * 0.5000;
    
    // 3. Create final offset
    vec2 offset = (f * 2. + (r * 0.5000));
    
    // Apply texture with offset masked by mDist
    vec4 color = texture(uTexture, uv + offset * mDist);
    
    fragColor = color;
}
// Analysis
// Just like the Liquify shader, this code has several parameters set to 0.0000 which disable specific features:

// Mouse Influence: mix(vec2(0), (uMousePos-0.5), 0.0000) prevents the mouse from moving the center of the distortion.

// 3D Noise Slice: Inside the FBM calls, the Z-axis is 0.0000 * 25. + time. This means it only slices through the noise based on time, not depth/intensity.

// Rotation/Skew: These are also multiplied by 0.

// If you want the effect to follow your mouse, you will need to change the 0.0000 in the mPos calculation to 1.0 (or a value between 0 and 1).
```

## File: extracted/distort/flowfield
```
// This shader implements a Flowfield Distortion effect, commonly used to simulate a fluid, smoke, or heat haze motion. The distortion is achieved by iteratively sampling the texture along a path defined by 3D Perlin Noise, with the Z-dimension of the noise being driven by time.

// 1. Vertex Shader (Shared)
// OpenGL Shading Language

#version 300 es
precision mediump float;

// Attributes
in vec3 aVertexPosition;
in vec2 aTextureCoord;

// Uniforms
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat4 uTextureMatrix;

// Outputs
out vec2 vTextureCoord;
out vec3 vVertexPosition;

void main() {
    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
    vTextureCoord = (uTextureMatrix * vec4(aTextureCoord, 0.0, 1.0)).xy;
}

// 2. Fragment Shader (Perlin Flow and Distortion)
// The core of this shader is the flow() function, which takes an initial texture coordinate (st) and iteratively displaces it based on the direction derived from Perlin noise.

// OpenGL Shading Language

#version 300 es
precision highp float;

// Inputs
in vec3 vVertexPosition;
in vec2 vTextureCoord;

// Uniforms
uniform sampler2D uTexture;
uniform float uTime;
uniform vec2 uMousePos;
uniform vec2 uResolution;

out vec4 fragColor;

const float PI = 3.1415926;
const float MAX_ITERATIONS = 16.;

// --- Utility Functions ---

float ease (int easingFunc, float t) {
    // Simple linear ease
    return t;
}

// 3D Hash function (used to generate random gradient vectors for Perlin Noise)
vec3 hash33(vec3 p3) {
    p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));
    p3 += dot(p3, p3.yxz + 19.19);
    return -1.0 + 2.0 * fract(vec3(
        (p3.x + p3.y) * p3.z,
        (p3.x + p3.z) * p3.y,
        (p3.y + p3.z) * p3.x
    ));
}

// 3D Perlin Noise implementation
float perlin_noise(vec3 p) {
    vec3 pi = floor(p);   // Integer part of coordinate
    vec3 pf = p - pi;     // Fractional part of coordinate
    vec3 w = pf * pf * (3.0 - 2.0 * pf); // Smooth Hermite interpolation weights

    // Dot products of gradient vectors (hash33) at 8 surrounding corners with the offset vector (pf - corner_offset)
    float n000 = dot(pf - vec3(0.0, 0.0, 0.0), hash33(pi + vec3(0.0, 0.0, 0.0)));
    float n100 = dot(pf - vec3(1.0, 0.0, 0.0), hash33(pi + vec3(1.0, 0.0, 0.0)));
    float n010 = dot(pf - vec3(0.0, 1.0, 0.0), hash33(pi + vec3(0.0, 1.0, 0.0)));
    float n110 = dot(pf - vec3(1.0, 1.0, 0.0), hash33(pi + vec3(1.0, 1.0, 0.0)));
    float n001 = dot(pf - vec3(0.0, 0.0, 1.0), hash33(pi + vec3(0.0, 0.0, 1.0)));
    float n101 = dot(pf - vec3(1.0, 0.0, 1.0), hash33(pi + vec3(1.0, 0.0, 1.0)));
    float n011 = dot(pf - vec3(0.0, 1.0, 1.0), hash33(pi + vec3(0.0, 1.0, 1.0)));
    float n111 = dot(pf - vec3(1.0, 1.0, 1.0), hash33(pi + vec3(1.0, 1.0, 1.0)));

    // Interpolate along X, then Y, then Z
    float nx00 = mix(n000, n100, w.x);
    float nx01 = mix(n001, n101, w.x);
    float nx10 = mix(n010, n110, w.x);
    float nx11 = mix(n011, n111, w.x);

    float nxy0 = mix(nx00, nx10, w.y);
    float nxy1 = mix(nx01, nx11, w.y);

    float nxyz = mix(nxy0, nxy1, w.z);
    
    return nxyz;
}

// --- Flow Field Calculation ---

// Takes an input UV coordinate 'st' and moves it along the flow field
vec2 flow (in vec2 st) {
    float aspectRatio = uResolution.x / uResolution.y;
    
    // Mouse interaction parameters (disabled 0.0000 and floor(1.0000))
    vec2 mPos = vec2(0.5, 0.5) + mix(vec2(0), (uMousePos - 0.5), 0.0000);
    vec2 pos = mix(vec2(0.5, 0.5), mPos, floor(1.0000));
    
    // Distance calculation for controlling strength based on mouse proximity (mostly disabled)
    float dist = ease(0, max(0., 1. - distance(st * vec2(aspectRatio, 1), mPos * vec2(aspectRatio, 1)) * 4. * (1. - 1.0000)));

    float sprd = (0.5000 + 0.01) / ((aspectRatio + 1.) / 2.);
    float amt = 0.5000 * 0.01 * dist; // Distortion step amount (small, scaled by mouse dist)
    
    if(amt <= 0.) {
        return st;
    }
    
    vec2 invPos = 1. - pos;
    float freq = 5. * sprd; // Noise frequency/tile size
    float t = 0.0000 * 5. + uTime / 60.; // Time variable (z-coordinate for 3D noise)
    float degrees = 360. * (0.5000 * 6.); // Max angle deviation (180 degrees)
    float radians = degrees * PI / 180.;

    // Iterative flow field sampling
    for (float i = 0.; i < MAX_ITERATIONS; i++) {
        // Prepare UV for noise lookup (center, aspect-corrected, and offset by invPos)
        vec2 scaled = (st - 0.5) * vec2(aspectRatio, 1) + invPos;
        
        // Lookup Perlin Noise (result in [-1, 1])
        float perlin = perlin_noise(vec3((scaled - 0.5) * freq, t)) - 0.5;
        
        // Map noise value to an angle
        float ang = perlin * radians;
        
        // Calculate the step vector based on the angle
        st += vec2(cos(ang), sin(ang)) * amt;
        
        // Keep coordinates in bounds
        st = clamp(st, 0., 1.);
    }
    return st; // Return the final, distorted UV coordinate
}

// --- Main Function ---

void main() {
    vec2 uv = vTextureCoord;
    
    // 1. Calculate the distorted UV coordinate
    vec2 flowUv = flow(uv);
    
    // 2. Sample the texture at the distorted UV
    // mix(uv, flowUv, 1.0000) results in sampling only the flowUv
    vec4 color = texture(uTexture, mix(uv, flowUv, 1.0000));
    
    fragColor = color;
}
```

## File: extracted/distort/liquify
```
// 1. Vertex Shader

#version 300 es
precision mediump float;

// Attributes
in vec3 aVertexPosition;
in vec2 aTextureCoord;

// Uniforms
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat4 uTextureMatrix;

// Outputs to Fragment Shader
out vec2 vTextureCoord;
out vec3 vVertexPosition;

void main() {
    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
    vTextureCoord = (uTextureMatrix * vec4(aTextureCoord, 0.0, 1.0)).xy;
}

// Fragment Shader

OpenGL Shading Language

#version 300 es
precision mediump float;

// Inputs from Vertex Shader
in vec3 vVertexPosition;
in vec2 vTextureCoord;

// Uniforms
uniform float uTime;
uniform sampler2D uTexture;
uniform vec2 uMousePos;
uniform vec2 uResolution;

// Output
out vec4 fragColor;

// Constants
const float PI = 3.14159265;

// --- Helper Functions ---

float ease(int easingFunc, float t) {
    return t;
}

mat2 rot(float a) {
    return mat2(cos(a), -sin(a), sin(a), cos(a));
}

// --- Liquify Logic ---

vec2 liquify(vec2 st, float dist) {
    float aspectRatio = uResolution.x / uResolution.y;
    
    // Mouse interaction and Drift logic
    // Note: Several values here are 0.0000, effectively disabling mouse/drift unless changed
    vec2 pos = vec2(0.5, 0.5) + mix(vec2(0), (uMousePos - 0.5), 0.0000);
    vec2 drift = vec2(0, 0.0000 * uTime * 0.0125) * rot(0.0000 * -2. * PI);
    pos += drift;
    
    vec2 skew = mix(vec2(1), vec2(1, 0), 0.0000);
    
    // Normalize coordinates based on aspect ratio
    st -= pos;
    st.x *= aspectRatio;
    st = st * rot(0.0000 * 2. * PI);
    st *= skew;
    
    // Wave/Distortion Parameters
    float freq = (5.0 * (0.5000 + 0.1));
    float t = uTime * 0.025;
    float amplitude = 0.5000 * mix(0.2, 0.2 / (0.5000 + 0.05), 0.25) * dist;
    
    // Iterative Rotation and Sine Wave Application
    for (float i = 1.0; i <= 5.0; i++) {
        st = st * rot(i / 5. * PI * 2.);
        float ff = i * freq;
        st.x += amplitude * cos(ff * st.y + t);
        st.y += amplitude * sin(ff * st.x + t);
    }
    
    // Restore coordinates
    st /= skew;
    st = st * rot(0.0000 * -2. * PI);
    st.x /= aspectRatio;
    st += pos;
    
    return st;
}

// --- Main ---

void main() {
    vec2 uv = vTextureCoord;
    float aspectRatio = uResolution.x / uResolution.y;
    
    vec2 mPos = vec2(0.5, 0.5) + mix(vec2(0), (uMousePos - 0.5), 0.0000);
    
    // Calculate distance mask for the effect
    float dist = ease(0, max(0., 1. - distance(uv * vec2(aspectRatio, 1), mPos * vec2(aspectRatio, 1)) * 4. * (1. - 1.0000)));
    
    // If effect is negligible, return original texture immediately
    if (dist <= 0.001) {
        fragColor = texture(uTexture, uv);
        return;
    }
    
    // Calculate distorted UVs
    vec2 liquifiedUV = liquify(uv, dist);
    vec2 normalizedUv = normalize(liquifiedUV - uv);
    float distanceUv = length(liquifiedUV - uv);
    
    // Chromatic Aberration (RGB Split)
    float chromAbb = 0.2500 * 0.5;
    vec2 offsetR = liquifiedUV + chromAbb * normalizedUv * distanceUv;
    vec2 offsetG = liquifiedUV;
    vec2 offsetB = liquifiedUV - chromAbb * normalizedUv * distanceUv;
    
    // Sample texture with offsets
    vec4 colorR = texture(uTexture, mix(uv, offsetR, 0.5000));
    vec4 colorG = texture(uTexture, mix(uv, offsetG, 0.5000));
    vec4 colorB = texture(uTexture, mix(uv, offsetB, 0.5000));
    
    // Combine channels
    vec4 color = vec4(colorR.r, colorG.g, colorB.b, colorR.a * colorG.a * colorB.a);
    
    fragColor = color;
}


// A Note on the Logic
// In the fragment shader (Liquify code), there are several places where values are multiplied by 0.0000 or mixed with 0.0000.

// Example: mix(vec2(0), (uMousePos - 0.5), 0.0000)

// This effectively turns off features like mouse interaction and rotation in its current state. If you want the effect to react to the mouse or animate more noticeably, you will need to change those 0.0000 values to something between 0.0 and 1.0.

// Would you like me to help you adjust those values to make the liquify effect active?
```

## File: extracted/distort/noise
```
// 1. Vertex Shader
// This is the standard pass-through shader for 3D/2D rendering.

// OpenGL Shading Language

#version 300 es
precision mediump float;

// Attributes
in vec3 aVertexPosition;
in vec2 aTextureCoord;

// Uniforms
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat4 uTextureMatrix;

// Outputs
out vec2 vTextureCoord;
out vec3 vVertexPosition;

void main() {
    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
    vTextureCoord = (uTextureMatrix * vec4(aTextureCoord, 0.0, 1.0)).xy;
}

// 2. Fragment Shader
// This implements the BCC Noise, calculates its derivatives to get a smooth vector field, and uses that field to distort the texture coordinates (texture warping).

// OpenGL Shading Language

#version 300 es
precision highp float;

// Inputs
in vec2 vTextureCoord;
in vec3 vVertexPosition;

// Uniforms
uniform sampler2D uTexture;
uniform float uTime;
uniform vec2 uMousePos;
uniform vec2 uResolution;

// Output
out vec4 fragColor;

// --- Noise Helper Functions ---

float ease(int easingFunc, float t) {
    return t;
}

// Hashing function for permutation table
vec4 permute(vec4 t) {
    return t * (t * 34.0 + 133.0);
}

// Gradient generation for BCC noise
vec3 grad(float hash) {
    // Generates a gradient vector based on the hash index
    vec3 cube = mod(floor(hash / vec3(1.0, 2.0, 4.0)), 2.0) * 2.0 - 1.0;
    vec3 cuboct = cube;
    
    // Logic for generating the cuboctahedral grid points
    float index0 = step(0.0, 1.0 - floor(hash / 16.0));
    float index1 = step(0.0, floor(hash / 16.0) - 1.0);
    
    cuboct.x *= 1.0 - index0;
    cuboct.y *= 1.0 - index1;
    cuboct.z *= 1.0 - (1.0 - index0 - index1);
    
    float type = mod(floor(hash / 8.0), 2.0);
    vec3 rhomb = (1.0 - type) * cube + type * (cuboct + cross(cube, cuboct));
    
    vec3 grad = cuboct * 1.22474487139 + rhomb;
    grad *= (1.0 - 0.042942436724648037 * type) * 3.5946317686139184;
    
    return grad;
}

// Core BCC noise function: calculates the noise value and its 3D gradient (derivatives)
vec4 bccNoiseDerivativesPart(vec3 X) {
    vec3 b = floor(X);
    vec4 i4 = vec4(X - b, 2.5);
    
    // Determine the 4 nearest lattice points (v1, v2, v3, v4)
    vec3 v1 = b + floor(dot(i4, vec4(.25)));
    vec3 v2 = b + vec3(1, 0, 0) + vec3(-1, 1, 1) * floor(dot(i4, vec4(-.25, .25, .25, .35)));
    vec3 v3 = b + vec3(0, 1, 0) + vec3(1, -1, 1) * floor(dot(i4, vec4(.25, -.25, .25, .35)));
    vec3 v4 = b + vec3(0, 0, 1) + vec3(1, 1, -1) * floor(dot(i4, vec4(.25, .25, -.25, .35)));
    
    // Hash the lattice points
    vec4 hashes = permute(mod(vec4(v1.x, v2.x, v3.x, v4.x), 289.0));
    hashes = permute(mod(hashes + vec4(v1.y, v2.y, v3.y, v4.y), 289.0));
    hashes = mod(permute(mod(hashes + vec4(v1.z, v2.z, v3.z, v4.z), 289.0)), 48.0);
    
    // Distance vectors from input point X to lattice points
    vec3 d1 = X - v1; vec3 d2 = X - v2; vec3 d3 = X - v3; vec3 d4 = X - v4;
    
    // Attenuation function: (0.75 - r^2)^4
    vec4 a = max(0.75 - vec4(dot(d1, d1), dot(d2, d2), dot(d3, d3), dot(d4, d4)), 0.0);
    vec4 aa = a * a; vec4 aaaa = aa * aa;
    
    // Gradients
    vec3 g1 = grad(hashes.x); vec3 g2 = grad(hashes.y);
    vec3 g3 = grad(hashes.z); vec3 g4 = grad(hashes.w);
    
    // Extrapolations (dot product of distance and gradient)
    vec4 extrapolations = vec4(dot(d1, g1), dot(d2, g2), dot(d3, g3), dot(d4, g4));
    
    // Calculate 3D derivative (gradient of the noise function)
    vec3 derivative = -8.0 * mat4x3(d1, d2, d3, d4) * (aa * a * extrapolations)
                    + mat4x3(g1, g2, g3, g4) * aaaa;
                    
    // Result: (dF/dx, dF/dy, dF/dz, F)
    return vec4(derivative, dot(aaaa, extrapolations));
}

// Final BCC Noise function, including coordinate space transform
vec4 bccNoiseDerivatives_XYBeforeZ(vec3 X) {
    // Orthonormal map (rotation/skew) to transform input space to BCC lattice
    mat3 orthonormalMap = mat3(
        0.788675134594813, -0.211324865405187, -0.577350269189626,
        -0.211324865405187, 0.788675134594813, -0.577350269189626,
        0.577350269189626, 0.577350269189626, 0.577350269189626
    );
    X = orthonormalMap * X;
    
    // Combine two parts of the BCC lattice for seamless tiling
    vec4 result = bccNoiseDerivativesPart(X) + bccNoiseDerivativesPart(X + 144.5);
    
    // Transform derivative back into the original coordinate space
    return vec4(result.xyz * orthonormalMap, result.w);
}

// --- Texture Warping Logic ---

const float PI = 3.14159265359;

mat2 rot(float a) {
    return mat2(cos(a), -sin(a), sin(a), cos(a));
}

// Gets the distorted UV by using the BCC noise gradient
vec2 get2sNoise(vec2 uv, vec2 textureCoord) {
    // Calculate noise and derivatives (xy components are the gradient vector)
    // Z-axis of noise is driven by uTime for animation
    vec4 noise = bccNoiseDerivatives_XYBeforeZ(vec3(
        uv * vec2(0.5000, 1. - 0.5000) * 0.7, 
        0.0000 + uTime * 0.02
    ));
    
    // Use the gradient (noise.xy) as an offset vector
    vec2 offset = noise.xy / 7. + 0.5;
    
    // Mix the original texture coordinate with the offset
    return mix(textureCoord, offset, 0.5000);
}

vec2 getNoiseOffset(vec2 uv, vec2 textureCoord) {
    return get2sNoise(uv, textureCoord);
}

// --- Main ---

void main() {
    vec2 uv = vTextureCoord;
    float aspectRatio = uResolution.x / uResolution.y;
    
    // Mouse Interaction / Position Setup
    vec2 mPos = vec2(0.5, 0.5) + mix(vec2(0), (uMousePos - 0.5), 0.0000);
    vec2 pos = mix(vec2(0.5, 0.5), mPos, floor(1.0000));
    
    // Drift (disabled since 0.0000)
    vec2 drift = vec2(0, 0.0000 * uTime * 0.0125);
    pos += drift * rot(0.1350 * -2. * PI);
    
    // Scale and Rotate UV coordinates for the noise space
    vec2 st = (uv - pos) * vec2(aspectRatio, 1);
    st *= 12. * 1.6240;
    st = rot(0.1350 * -2. * PI) * st;
    
    // Get the distorted UVs
    vec2 noise = getNoiseOffset(st, uv);
    
    // Distance Mask (Effect fades out away from the mouse/center)
    float dist = ease(0, max(0., 1. - distance(uv * vec2(aspectRatio, 1), mPos * vec2(aspectRatio, 1)) * 4. * (1. - 1.0000)));
    
    // The conditional block is currently disabled by the 0 == 1
    if (0 == 1) {
        dist = max(0., (0.5 - dist));
    }
    
    // Apply the noise/distortion based on the distance mask
    uv = mix(uv, noise, dist);
    
    // Sample the texture with the final distorted UV
    vec4 color = texture(uTexture, uv);
    fragColor = color;
}
// Key Observation
// Similar to the previous shaders, the effect is largely restricted due to several parameters being set near zero:

// 0.0000 in mPos disables mouse position influence.

// 0.0000 in drift disables position drift over time.

// The dist calculation has (1. - 1.0000) which evaluates to 0.0, effectively making dist equal to 1 everywhere if (1. - 1.0000) were used as a multiplier for the distance check. However, since the expression is distance(...) * 4. * (1. - 1.0000), the multiplier on the distance is zero, meaning max(0., 1. - 0) which forces dist to be 1.0 everywhere, resulting in a full-screen distortion effect (not localized to the mouse).
```

## File: extracted/distort/polar
```
// This shader performs a Polar Coordinate Transformation (or polar projection) on the input texture. It maps the texture's vertical axis to the radius and its horizontal axis to the angle, creating a swirling effect centered at a specific point on the screen.

// Here is the formatted code for both the Vertex and Fragment shaders.

// 1. Vertex Shader
// This is the standard pass-through shader, handling basic transformations and passing UVs.

OpenGL Shading Language

#version 300 es
precision mediump float;

// Attributes
in vec3 aVertexPosition;
in vec2 aTextureCoord;

// Uniforms
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat4 uTextureMatrix;

// Outputs
out vec2 vTextureCoord;
out vec3 vVertexPosition;

void main() {
    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
    vTextureCoord = (uTextureMatrix * vec4(aTextureCoord, 0.0, 1.0)).xy;
}


// 2. Fragment Shader
// This shader converts Cartesian coordinates to polar coordinates to sample the texture, resulting in the swirling effect. It also includes logic to blend the vertical texture seam.

// OpenGL Shading Language

#version 300 es
precision mediump float;

// Inputs
in vec3 vVertexPosition;
in vec2 vTextureCoord;

// Uniforms
uniform sampler2D uTexture;
uniform float uTime;
uniform vec2 uMousePos;
uniform vec2 uResolution;

// Output
out vec4 fragColor;

// Constants
const float PI = 3.1415926;

// --- Polar Transformation Function ---

// Converts Cartesian coordinates (uv) relative to a center (pos) into polar UVs.
vec2 polar(vec2 uv, vec2 pos) {
    uv -= pos;
    
    // Convert to polar coordinates
    float angle = atan(uv.y, uv.x);
    float radius = length(uv);
    
    // --- Angle (Horizontal Texture Coordinate) ---
    // angle: maps [-PI, PI] to [0, 2*PI] for a full circle mapping.
    // + (uTime * 0.05): adds continuous rotation.
    float xCoord = mod((angle + 0.0000 * 2.0 * PI) + (uTime * 0.05) + PI, 2.0 * PI) / (2.0 * PI);
    
    // --- Radius (Vertical Texture Coordinate) ---
    float yCoordRaw = radius * 1.0000;
    
    // Gamma correction/shaping for the radius (currently disabled: pow(2, 0) = 1)
    float gamma = pow(2.0, (0.5000 - 0.5) * 4.0);
    float yCoord = pow(fract(yCoordRaw), gamma);
    
    // Returns (Radius UV, Angle UV)
    return fract(vec2(yCoord, xCoord));
}

// --- Main ---

void main() {
    vec2 uv = vTextureCoord;
    
    // Scale UV by aspect ratio to make the center circular, not elliptical.
    vec2 aspectRatio = vec2(uResolution.x / uResolution.y, 1);
    
    // Center point for the swirl. Mouse interaction is disabled (0.0000).
    vec2 pos = vec2(0.5, 0.5) + mix(vec2(0), (uMousePos - 0.5), 0.0000);
    
    // Calculate the polar UV for sampling
    vec2 polarCoord = polar(uv * aspectRatio, pos * aspectRatio);
    
    // Sample 1: The primary texture coordinate
    vec4 color1 = texture(uTexture, polarCoord);
    
    // --- Seam Blending ---
    
    // Calculate the opposite UV for blending at the 0/1 seam of the texture (vertical wrap)
    // The "opposite" is shifted by 0.5 in the angle direction (y component of polarCoord).
    vec2 oppositePolar = vec2(polarCoord.x, polarCoord.y > 0.5 ? polarCoord.y - 0.5 : polarCoord.y + 0.5);
    vec4 color2 = texture(uTexture, oppositePolar);
    
    float seamBlend = 0.0;
    float blendWidth = 0.5000 * 0.1;
    
    // Check if the coordinate is near the 0.0 or 1.0 seam (angle wrap)
    if (polarCoord.y < blendWidth || polarCoord.y > 1.0 - blendWidth) {
        if (polarCoord.y < blendWidth) {
            // Near 0.0 seam, blend towards 1.0
            seamBlend = 1.0 - (polarCoord.y / blendWidth);
        } else {
            // Near 1.0 seam, blend towards 0.0
            seamBlend = (polarCoord.y - (1.0 - blendWidth)) / blendWidth;
        }
        seamBlend = smoothstep(0.0, 1.0, seamBlend);
    }
    
    // Blend the primary color with the opposite color near the seam
    fragColor = mix(color1, color2, seamBlend);
}

// This code creates an animated, circularly projected image. The continuous rotation is currently active via (uTime * 0.05).
```

## File: extracted/distort/ripple
```
// This shader implements a classic Ripple or Wave distortion effect, often called a sine-wave displacement. The effect radiates outwards from a central point, creating concentric waves that travel over time.

// Here is the formatted code for both the Vertex and Fragment shaders.

// 1. Vertex Shader
// This is the standard pass-through shader, handling basic transformations and passing UVs.

// OpenGL Shading Language

#version 300 es
precision mediump float;

// Attributes
in vec3 aVertexPosition;
in vec2 aTextureCoord;

// Uniforms
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat4 uTextureMatrix;

// Outputs
out vec2 vTextureCoord;
out vec3 vVertexPosition;

void main() {
    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
    vTextureCoord = (uTextureMatrix * vec4(aTextureCoord, 0.0, 1.0)).xy;
}

// 2. Fragment Shader
// This shader calculates the distance from the center point and uses a time-animated sine wave to displace the UV coordinates radially.

// OpenGL Shading Language

#version 300 es
precision highp float;

// Inputs
in vec3 vVertexPosition;
in vec2 vTextureCoord;

// Uniforms
uniform sampler2D uTexture;
uniform float uTime;
uniform vec2 uMousePos;
uniform vec2 uResolution;

// Output
out vec4 fragColor;

// Constants
const float PI = 3.1415926;

// --- Helper Functions ---

float ease(int easingFunc, float t) {
    return t;
}

// --- Main ---

void main() {
    vec2 uv = vTextureCoord;
    vec2 aspectRatio = vec2(uResolution.x / uResolution.y, 1);
    
    // 1. Calculate Center Position
    // Mouse position influence is disabled (0.0000), so pos is locked to (0.5, 0.5)
    vec2 pos = vec2(0.5, 0.5) + mix(vec2(0), uMousePos - 0.5, 0.0000);
    
    // 2. Adjust Coordinates for Aspect Ratio
    // Center coordinates around (0,0) and scale by aspect ratio for a circular (not elliptical) effect
    vec2 adjustedPos = (pos - 0.5) * aspectRatio;
    vec2 adjustedUv = (uv - 0.5) * aspectRatio;
    
    float dist;
    vec2 direction;
    float easingDist;
    
    // 3. Calculate Distance and Direction
    dist = length(adjustedUv - adjustedPos);
    direction = normalize(adjustedUv - adjustedPos);
    
    // Handle the center point where distance is zero
    if (length(direction) < 0.0001) {
        direction = vec2(0.0, 1.0);
    }
    
    // --- Easing/Masking ---
    
    easingDist = dist;
    
    // Calculate the distance mask value (1. - 1.0000) makes the effective radius check zero,
    // so easeDistValue is max(0, 1 - dist), which creates a full-screen effect that fades out from the center.
    float easeDistValue = max(0., 1. - easingDist - (1. - 1.0000)); 
    
    // This condition is disabled (0 != 1)
    if (0 == 1) {
        easeDistValue = max(0., (1.0000 - easingDist));
    }
    
    float easeFactor = ease(0, easeDistValue);
    
    // --- Wave Calculation ---
    
    // Frequency: 0.5000 * 50. (25 waves). `mix` factor is 0.0000, so frequency is constant.
    float freq = 0.5000 * 50. * mix(1., (1. - abs(dist)), 0.0000);
    
    // Strength: 0.5000 * 0.2 * easeFactor (scaled by the mask)
    float strength = 0.5000 * 0.2 * easeFactor;
    
    // The ripple wave: `sin(distance * frequency - time)`
    float wave = sin(dist * freq - uTime * 0.05) * strength;
    
    // 4. Apply Displacement
    // Offset UVs radially outwards (direction vector) by the wave height
    uv += direction * wave;
    
    // 5. Sample Texture
    vec4 color = texture(uTexture, uv);
    fragColor = color;
}
// This shader is set up to create a ripple effect that starts at the center of the screen (pos = 0.5, 0.5) and spreads outwards, gradually fading in strength the further it gets from the center (due to easeDistValue being 1. - easingDist).
```

## File: extracted/distort/shatter
```
// 1. Vertex Shader
// This is the standard pass-through shader, handling basic transformations and passing UVs.

// OpenGL Shading Language

#version 300 es
precision mediump float;

// Attributes
in vec3 aVertexPosition;
in vec2 aTextureCoord;

// Uniforms
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat4 uTextureMatrix;

// Outputs
out vec2 vTextureCoord;
out vec3 vVertexPosition;

void main() {
    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
    vTextureCoord = (uTextureMatrix * vec4(aTextureCoord, 0.0, 1.0)).xy;
}

// 2. Fragment Shader
// This implements the Voronoi noise with FBM to generate a fragmented distortion field, which is then used to offset the texture coordinates.

// OpenGL Shading Language

#version 300 es
precision mediump float;

// Inputs
in vec3 vVertexPosition;
in vec2 vTextureCoord;

// Uniforms
uniform sampler2D uTexture;
uniform float uTime;
uniform vec2 uMousePos;
uniform vec2 uResolution;

// Output
out vec4 fragColor;

// Constants
const float PI = 3.14159265359;

// --- Helper Functions ---

float ease(int easingFunc, float t) {
    return t;
}

// 2D Random function using dot product for texture coordinates
vec2 random2( vec2 p ) {
    return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);
}

// 2D Rotation matrix
mat2 rot(float a) {
    return mat2(cos(a), -sin(a), sin(a), cos(a));
}

// --- Noise Functions ---

// Calculates the position of the nearest Voronoi cell center
vec2 voronoidNoise(vec2 st) {
    vec2 i_st = floor(st);
    vec2 f_st = fract(st);
    
    float m_dist = 15.;
    vec2 m_point;
    vec2 d;
    
    // Check 9 surrounding cells
    for (int j = -1; j <= 1; j++ ) {
        for (int i = -1; i <= 1; i++ ) {
            vec2 neighbor = vec2(float(i), float(j));
            
            // Random point in the cell, animated by uTime
            vec2 point = random2(i_st + neighbor);
            point = 0.5 + 0.5 * sin(5. + uTime * 0.2 + 6.2831 * point);
            
            vec2 diff = neighbor + point - f_st;
            float dist = length(diff);
            
            // Find the minimum distance and the corresponding point
            if( dist < m_dist ) {
                m_dist = dist;
                m_point = point;
                d = diff;
            }
        }
    }
    // Returns the position of the nearest cell center (relative to cell corner)
    return m_point;
}

// Fractal Brownian Motion applied to Voronoi noise (multi-octave Voronoi)
vec2 voronoiFBM(vec2 st) {
    vec2 value = vec2(0.0);
    vec2 shift = vec2(100.0);
    float xp = sqrt(2.);
    mat2 r = rot(0.5);
    
    // 2 octaves of FBM
    for (int i = 0; i < 2; i++) {
        value += voronoidNoise(st);
        st = st * xp + shift;
        st = r * st;
    }
    
    // Average the result
    return value / float(2);
}

// --- Main ---

void main() {
    vec2 uv = vTextureCoord;
    float aspectRatio = uResolution.x / uResolution.y;
    
    // Skew is disabled (0.0000)
    vec2 skew = mix(vec2(1), vec2(1, 0), 0.0000);
    
    // Scale and adjust UV coordinates for the noise space
    vec2 st = (uv - vec2(0.5, 0.5)) * vec2(aspectRatio, 1.) * 50. * 0.2120;
    
    // Rotate and Skew noise space
    st = st * rot(0.1134 * 2. * PI) * skew;
    
    // Get the FBM Voronoi point position
    vec2 m_point = voronoiFBM(st);
    
    // Calculate the UV offset vector from the Voronoi point
    vec2 offset = (m_point * 0.2 * 0.2500 * 2.) - (0.2500 * 0.2);
    
    // --- Effect Masking ---
    
    // Mouse position (disabled: 0.0000)
    vec2 mPos = vec2(0.5, 0.5) + mix(vec2(0), (uMousePos - 0.5), 0.0000);
    vec2 pos = mix(vec2(0.5, 0.5), mPos, floor(1.0000));
    
    // Distance Mask: The calculation results in dist = 1.0 everywhere,
    // causing a full-screen effect (similar to previous shaders).
    float dist = ease(0, max(0., 1. - distance(uv * vec2(aspectRatio, 1), mPos * vec2(aspectRatio, 1)) * 4. * (1. - 1.0000)));
    
    // Sample texture with the noise offset scaled by the distance mask
    vec4 color = texture(uTexture, uv + offset * dist);
    
    fragColor = color;
}
// Observation
// This shader creates a cell-based distortion that animates over time. Due to the distance mask calculation resulting in dist = 1.0 (as discussed in the previous shader), the shatter effect is applied uniformly across the entire screen, rather than being localized around the mouse or center.

// If you want the shatter effect to be concentrated in a specific area, you need to adjust the dist calculation.
```

## File: extracted/distort/sineWaves
```
// This shader creates a Sinusoidal Wave Distortion effect by displacing the texture coordinates (UVs) during the fragment shader execution. The waves move and are driven by time.

// 1. Vertex Shader (Shared)
// This is a standard vertex shader, passing the transformed texture coordinates and position data to the fragment shader.

// OpenGL Shading Language

#version 300 es
precision mediump float;

// Attributes
in vec3 aVertexPosition;
in vec2 aTextureCoord;

// Uniforms
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat4 uTextureMatrix;

// Outputs
out vec2 vTextureCoord;
out vec3 vVertexPosition;

void main() {
    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
    vTextureCoord = (uTextureMatrix * vec4(aTextureCoord, 0.0, 1.0)).xy;
}

// 2. Fragment Shader (Sinusoidal Distortion)
// This shader calculates two independent sine waves (one for X displacement, one for Y displacement) and adds them to the UV coordinates, resulting in a wobbly, water-like distortion.

// OpenGL Shading Language

#version 300 es
precision mediump float;

// Inputs
in vec2 vTextureCoord;
in vec3 vVertexPosition;

// Uniforms
uniform sampler2D uTexture;
uniform float uTime;
uniform vec2 uMousePos;
uniform vec2 uResolution;

out vec4 fragColor;

const float PI = 3.141592;

float ease (int easingFunc, float t) {
    return t; // Linear ease
}

void main() {
    vec2 uv = vTextureCoord;
    
    // Convert UV coordinates from [0, 1] to [-1, 1] range
    vec2 waveCoord = vTextureCoord.xy * 2.0 - 1.0; 
    
    // --- Wave Parameters ---
    float thirdPI = PI * 0.3333; // Phase offset or speed factor
    float time = uTime * 0.25;
    float frequency = 20.0 * 0.5000; // Frequency (10.0)
    float amp = 0.3000 * 0.2;        // Amplitude (0.06)

    // --- 1. Calculate Wave Displacements ---
    
    // Wave X (Horizontal displacement) based on vertical position (waveCoord.y)
    // The wave moves horizontally (along X) but ripples according to Y.
    // vec2(0.5, 0.5).y ensures the input coordinates are correctly zeroed/scaled.
    float waveX = sin((waveCoord.y + 0.5) * frequency + (time * thirdPI)) * amp; 
    
    // Wave Y (Vertical displacement) based on horizontal position (waveCoord.x)
    // The wave moves vertically (along Y) but ripples according to X.
    float waveY = sin((waveCoord.x - 0.5) * frequency + (time * thirdPI)) * amp;
    
    // Apply displacement to waveCoord.xy
    // The mix factors (0.0000) show that this shader is currently configured to apply only
    // the waveY displacement (vertical displacement) but has the option for both.
    waveCoord.xy += vec2(
        mix(waveX, 0., 0.0000), 
        mix(0., waveY, 0.0000)
    );
    
    // 2. Convert distorted coordinates back to UV range [0, 1]
    vec2 finalUV = waveCoord * 0.5 + 0.5;
    
    // --- 3. Mouse Interaction (Blending) ---
    
    float aspectRatio = uResolution.x / uResolution.y;
    
    // Mouse position adjusted (Mouse interaction disabled 0.0000)
    vec2 mPos = vec2(0.5, 0.5) + mix(vec2(0), (uMousePos - 0.5), 0.0000); 
    
    // dist: calculated proximity mask for blending
    // Since 0.0000 is used in the ease calculation, the effect is likely applied globally (dist=1).
    float dist = ease(0, max(0., 1. - distance(uv * vec2(aspectRatio, 1), mPos * vec2(aspectRatio, 1)) * 4. * (1. - 1.0000)));

    // Second conditional check (disabled: 0 == 1)
    if (0 == 1) { 
        dist = max(0., (0.5 - dist));
    }
    
    // Blend between the original UV and the final distorted UV
    // Since 'dist' is effectively 1 (or close to it), the distortion (finalUV) is primarily used.
    uv = mix(vTextureCoord, finalUV, dist);
    
    // 4. Final Sampling
    vec4 color = texture(uTexture, uv);
    fragColor = color;
}
```

## File: extracted/distort/skybox
```
// This shader implements a Spherical Projection or Skybox rendering technique, often used for displaying 360-degree panoramic textures (equirectangular maps). The camera's direction and field of view (FOV) are calculated from the screen coordinates and mouse input, and then used to sample the texture.

// Here is the formatted code for both the Vertex and Fragment shaders.

// 1. Vertex Shader
// This is the standard pass-through shader, handling basic transformations and passing UVs.

// OpenGL Shading Language

#version 300 es
precision mediump float;

// Attributes
in vec3 aVertexPosition;
in vec2 aTextureCoord;

// Uniforms
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat4 uTextureMatrix;

// Outputs
out vec2 vTextureCoord;
out vec3 vVertexPosition;

void main() {
    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
    vTextureCoord = (uTextureMatrix * vec4(aTextureCoord, 0.0, 1.0)).xy;
}

// 2. Fragment Shader
// This shader calculates a viewing ray for each pixel, rotates the ray based on mouse input, and then maps that ray direction to texture coordinates on an equirectangular image.

// OpenGL Shading Language

#version 300 es
precision highp float;

// Inputs
in vec3 vVertexPosition;
in vec2 vTextureCoord;

// Uniforms
uniform sampler2D uTexture;
uniform float uTime;
uniform vec2 uMousePos;

// Output
out vec4 fragColor;

// Constants
const float PI = 3.14159265;

// --- Projection and Ray Casting ---

// Calculates the direction vector (rayDir) from the camera through the pixel (uv)
// This also incorporates camera rotation based on mouse position.
vec3 getRayDirection(vec2 uv, vec2 mousePos, float aspect) {
    // 1. Transform UV to normalized screen coordinates (-1 to 1)
    vec2 screenPos = (uv - 0.5) * 2.0;
    screenPos.x *= aspect;
    screenPos.y *= -1.0; // Flip Y-axis
    
    // 2. Calculate FOV
    float minFOV = radians(20.0);
    float maxFOV = radians(120.0);
    float fov = mix(minFOV, maxFOV, 1.0000); // FOV is maxFOV (120 degrees)
    
    // 3. Calculate initial ray direction (in camera space)
    vec3 rayDir = normalize(vec3(
        screenPos.x * tan(fov / 2.0),
        screenPos.y * tan(fov / 2.0),
        -1.0
    ));
    
    // 4. Calculate camera rotation from mouse
    float rotX = (mousePos.y - 0.5) * PI; // Vertical rotation
    float rotY = (mousePos.x - 0.5) * PI * 2.0; // Horizontal rotation
    
    // Rotation matrices
    mat3 rotateY = mat3(
        cos(rotY), 0.0, -sin(rotY),
        0.0, 1.0, 0.0,
        sin(rotY), 0.0, cos(rotY)
    );
    mat3 rotateX = mat3(
        1.0, 0.0, 0.0,
        0.0, cos(rotX), sin(rotX),
        0.0, -sin(rotX), cos(rotX)
    );
    
    // Apply rotations
    return normalize(rotateX * rotateY * rayDir);
}

// Maps a 3D direction vector to 2D equirectangular UV coordinates (Longitude/Latitude)
vec2 directionToUVHorizontal(vec3 dir) {
    // Longitude is angle around Y-axis (X-Z plane)
    float longitude = atan(dir.z, dir.x);
    // Latitude is angle from pole (Y-axis)
    float latitude = acos(dir.y);
    
    vec2 uv;
    uv.x = longitude / (2.0 * PI) + 0.5; // Map [-PI, PI] to [0, 1]
    uv.y = latitude / PI; // Map [0, PI] to [0, 1]
    uv.x += 0.25; // Additional rotation/offset
    return uv;
}

// Alternative mapping, potentially for a different projection axis
vec2 directionToUVVertical(vec3 dir) {
    float longitude = atan(dir.z, dir.y);
    float latitude = acos(dir.x);
    
    vec2 uv;
    uv.y = longitude / PI * -1.;
    uv.x = (latitude / (2.0 * PI) + 0.5) * -1.;
    uv.x = fract(uv.x + 0.25);
    return uv;
}

// --- Texture Sampling ---

// Samples the texture, handling horizontal wrapping and optional blending
vec4 getRepeatHorizontalUV(vec2 uv) {
    vec2 finalUV = vec2(fract(uv.x), uv.y);
    vec4 col = texture(uTexture, finalUV);
    
    // Optional blending is disabled (0.0000 > 0.0 is false)
    if (0.0000 > 0.0) {
        // ... Blending logic omitted for brevity ...
    }
    
    return col;
}

vec4 getRepeatUV(vec2 uv) {
    return getRepeatHorizontalUV(uv);
}

// --- Main ---

void main() {
    // Aspect ratio used for ray projection (hardcoded to 2.0)
    float aspect = 2.; 
    
    // Mouse position is used to control camera rotation (1.0000 * 0.5 = 0.5 influence)
    vec2 mPos = vec2(0.5, 0.5) + mix(vec2(0), (uMousePos - 0.5), 1.0000 * 0.5);
    
    // Calculate the 3D ray direction for the current pixel
    vec3 rayDir = getRayDirection(vTextureCoord, mPos, aspect);
    
    // Map the ray to horizontal and vertical projection UVs
    vec2 uvHorizontal = directionToUVHorizontal(rayDir);
    vec2 uvVertical = directionToUVVertical(rayDir);
    
    // Mix between the two projections (0.4000 mix factor)
    vec2 sphereUV = mix(uvHorizontal, uvVertical, 0.4000);
    
    // FOV scaling compensation
    float minFOV = radians(20.0);
    float maxFOV = radians(120.0);
    float currentFOV = mix(minFOV, maxFOV, 1.0000); // Current FOV is 120 deg
    float fovCompensation = tan(currentFOV / 2.0);
    
    // Scaling and Zoom (mix(-0.1, 0.4, 0.6060) * 12.0 + 2.0)
    float compensatedScale = (mix(-0.1, 0.4, 0.6060) * 12.0 + 2.0) * (1.0 / fovCompensation);
    
    // Apply zoom/scale
    sphereUV = (sphereUV - 0.5) * compensatedScale + 0.5;
    
    // Apply time-based panoramic drift (slow horizontal scroll)
    sphereUV += vec2(0.5, 0) * uTime * 0.005;
    
    // Sample the texture
    vec4 col = getRepeatUV(sphereUV);
    
    fragColor = col;
}
```

## File: extracted/distort/swirl
```
// This shader creates a Swirl or Vortex Distortion effect by radially rotating the texture coordinates around a central point, with the rotation strength decreasing as the distance from the center increases.

// 1. Vertex Shader (Shared)
// This is a standard vertex shader, transforming the mesh vertices and texture coordinates.

// OpenGL Shading Language

#version 300 es
precision mediump float;

// Attributes
in vec3 aVertexPosition;
in vec2 aTextureCoord;

// Uniforms
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat4 uTextureMatrix;

// Outputs
out vec2 vTextureCoord;
out vec3 vVertexPosition;

void main() {
    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
    vTextureCoord = (uTextureMatrix * vec4(aTextureCoord, 0.0, 1.0)).xy;
}

// 2. Fragment Shader (Swirl Distortion)
// The fragment shader calculates the distance and angle of each pixel relative to the center, rotates the angle by an amount dependent on the distance (strongest at the center), and then converts the polar coordinates back to UV space.

// OpenGL Shading Language

#version 300 es
precision mediump float;

// Inputs
in vec3 vVertexPosition;
in vec2 vTextureCoord;

// Uniforms
uniform sampler2D uTexture;
uniform float uTime;
uniform vec2 uMousePos;
uniform vec2 uResolution;

out vec4 fragColor;

void main() {
    vec2 uv = vTextureCoord;
    vec2 originalUV = uv;
    
    // --- 1. Setup Center and Coordinates ---
    
    // Swirl Angle: 0.5000 * 10 = 5.0 radians (constant swirl)
    float angle = 0.5000 * 10.;
    
    // Center of swirl (Mouse interaction disabled 0.0000, defaults to (0.5, 0.5))
    vec2 pos = vec2(0.5, 0.5) + mix(vec2(0), (uMousePos - 0.5), 0.0000);
    
    // Translate coordinates so 'pos' is the origin (uv is now in [-0.5, 0.5] range)
    uv -= pos;
    
    // Aspect ratio correction (R is the coordinate vector scaled by aspect ratio)
    vec2 R = vec2(uv.x * uResolution.x / uResolution.y, uv.y);
    
    // Distance from center
    float distanceToCenter = length(R);
    distanceToCenter += 0.0000 * 0.5; // (Disabled)
    
    // --- 2. Apply Swirl (Polar Rotation) ---
    
    // Only apply distortion within a radius of 0.5000
    if (distanceToCenter <= 0.5000) {
        // Calculate the initial angle (rot) of the pixel in polar coordinates
        float rot = atan(R.y, R.x);
        
        // Add rotation amount: 'angle' scaled by a smoothstep falloff function.
        // Rotation is strongest at distance=0 and drops to 0 at distance=0.5000.
        rot += angle * smoothstep(0.5000, 0., distanceToCenter);
        
        // Add time-based rotation (uTime / 20.)
        rot += uTime / 20. + 0.0000 * 6.28;
        
        // Convert polar (distanceToCenter, rot) back to Cartesian coordinates (uv)
        uv = vec2(cos(rot), sin(rot));
        uv = distanceToCenter * uv + pos; // Scale by distance and translate back to [0, 1] range
    }
    
    // --- 3. Blend Distorted and Original UVs ---
    
    // t: Blend factor determined by distance from center, using smoothstep falloff
    // Blend goes from 0 at distance 0 (full distortion) to 1 at distance 0.5000 (no distortion).
    float t = smoothstep(0., 0.5000, distanceToCenter);
    
    // Use the smoothstep value `t` to blend between the distorted `uv` and the `originalUV`
    vec2 mixedUV = mix(uv, originalUV, t);
    
    // 4. Sample Texture
    // The final UV is mix(vTextureCoord, mixedUV, 1.0000), which forces the use of mixedUV.
    vec4 color = texture(uTexture, mix(vTextureCoord, mixedUV, 1.0000));
    
    fragColor = color;
}
```

## File: extracted/distort/waterRipples
```
// This is a multi-pass Water Ripple Simulation shader, typically implemented using a Ping-Pong Buffer technique based on the 2D wave equation (d'Alembert's equation, or similar finite difference methods).The passes are:Pass 4 (Simulation): The core physics. It calculates new water height (R channel) and velocity (G channel) using the neighbors' heights (Laplacian operator) and applies damping. It also injects new waves based on mouse movement.Pass 1 & 2 (Blur): Horizontal and vertical Gaussian blur passes (applied to the height map, which is the output of the simulation).Pass 0 (Normal Map): Calculates the surface normal vector from the blurred height map.Pass 3 (Render/Composite): Uses the normal map to calculate refraction, reflections, and lighting (caustics) for the final visual effect, blending the background texture (uBgTexture).1. Vertex Shaders (Shared)Both fragment shader chains use the same standard vertex shader for full-screen quads.
// OpenGL Shading Language
#version 300 es
precision mediump float;

// Attributes
in vec3 aVertexPosition;
in vec2 aTextureCoord;

// Uniforms
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;

// Outputs
out vec2 vTextureCoord;
out vec3 vVertexPosition;

void main() {
    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
    vTextureCoord = aTextureCoord;
}
// 2. Fragment Shader Pass 4: Simulation (Writes Height and Velocity)This is the physics pass, calculating the next state of the wave height and velocity using the neighbors' states. The output is written to a texture channel (e.g., $R \rightarrow \text{Height}$, $G \rightarrow \text{Velocity}$).
// OpenGL Shading Language
#version 300 es
precision highp float;

in vec3 vVertexPosition;
in vec2 vTextureCoord;

// Uniforms
uniform sampler2D uPingPongTexture; // Previous frame's height/velocity data
uniform vec2 uPreviousMousePos;
uniform vec2 uMousePos;
uniform vec2 uResolution;

out vec4 fragColor;

const float PI = 3.1415926;
const float TWOPI = 6.2831852;

void main() {
    vec2 aspect = vec2(uResolution.x / uResolution.y, 1);
    
    // Calculate the size of one texture pixel (texel) for neighbor sampling
    // Mix factor 0.7500 scales the texel size up (simulating a lower resolution/larger world scale)
    vec2 texelSize = (1.0 / (vec2(1080) * aspect)) * mix(1., 8., 0.7500); 
    vec2 vUv = vTextureCoord;
    
    // Mouse positions transformed by a mix (0.6000) for a centered/scaled ripple region
    vec2 mPos = mix(uMousePos, (uMousePos - 0.5) * 0.5 + 0.5, 0.6000);
    vec2 pmPos = mix(uPreviousMousePos, (uPreviousMousePos - 0.5) * 0.5 + 0.5, 0.6000);
    
    // Wave parameters
    float waveSpeed = 1.;
    float damping = mix(0.8, 0.999, 0.7500); // High damping mix (0.94925)
    float velocityDamping = damping;
    float heightDamping = damping;
    float time = 0.5;

    // Read current state (Height in R, Velocity in G)
    vec4 data = texture(uPingPongTexture, vUv);
    float height = data.r;
    float velocity = data.g;
    
    float laplacian = 0.0;
    float totalWeight = 0.0;
    
    // --- 1. Calculate Laplacian (Second Spatial Derivative) ---
    // Approximates the curvature of the wave height using a weighted average of neighbors.
    
    // Clamp region defines the bounds where the wave can exist (scaled by 0.6000)
    float scaleDiff = 0.6000 * 0.25;
    vec2 clampRegionMin = vec2(0.6000 * 0.5 - scaleDiff);
    vec2 clampRegionMax = vec2(1.0 - 0.6000 * 0.5 + scaleDiff);

    // Sample the 4 immediate neighbors (+X, -X, +Y, -Y)
    for (int i = 0; i < 4; i++) {
        vec2 offset;
        if (i == 0) offset = vec2(texelSize.x, 0.0);
        else if (i == 1) offset = vec2(-texelSize.x, 0.0);
        else if (i == 2) offset = vec2(0.0, texelSize.y);
        else offset = vec2(0.0, -texelSize.y);
        
        // Sample neighbor height (R channel) and apply clamping
        vec2 neighborUv = clamp(vUv + offset, clampRegionMin, clampRegionMax);
        float weight = 1.0 - length(offset) / (length(texelSize) * 2.0); // Simple weighting
        
        laplacian += texture(uPingPongTexture, neighborUv).r * weight;
        totalWeight += weight;
    }
    
    float avgNeighbors = laplacian / totalWeight;
    laplacian = avgNeighbors - height; // Laplacian = (Avg. Neighbor Height) - (Current Height)

    // --- 2. Update Wave Physics (Euler integration) ---
    
    // Acceleration: velocity += acceleration * time (where acceleration is proportional to Laplacian)
    velocity += waveSpeed * waveSpeed * laplacian;
    
    // Damping
    velocity *= velocityDamping;
    
    // Update Height: height += velocity * time (since time=0.5, this is half-step integration)
    height += velocity;
    
    // Damping
    height *= heightDamping;

    // --- 3. Inject New Waves (Mouse Input) ---
    
    float mouseSpeed = distance(mPos * aspect, pmPos * aspect);
    float dist = distance(vUv * aspect, mPos * aspect);
    float radius = 0.025;
    
    // Inject drop if within radius and mouse moved
    if (dist < radius && mouseSpeed > 0.0001) {
        float drop = cos(dist / radius * PI * time);
        float intensity = mouseSpeed * 20.;
        height += drop * intensity; // Add to height
    }
    
    // Output the new height and velocity for the next frame
    fragColor = vec4(height, velocity, 0.0, 1.0);
}

// 3. Fragment Shader Pass 1 & 2: Blur (Horizontal and Vertical)These passes perform a separable Gaussian blur on the height map output by Pass 4. This smoothing reduces aliasing and gives the surface a more liquid-like appearance.
// OpenGL Shading Language// ... (shared Gaussian weights and utility functions) ...

float getGaussianWeight(int index) {
    // ... [switch statement with 24 Gaussian weights] ...
    // Note: This is an unnormalized, 24-tap, one-sided kernel.
    switch(index) {
        case 0: return 0.7978845608028654;
        // ... (truncated)
        default: return 0.0;
    }
}

vec4 blur(vec2 uv, vec2 dir) {
    vec4 color = vec4(0.0);
    float total_weight = 0.0;
    
    // Center sample
    vec4 center = texture(uTexture, uv);
    float center_weight = getGaussianWeight(0);
    color += center * center_weight;
    total_weight += center_weight;
    
    // Loop over kernel taps (11 pairs of samples, 23 total taps including center)
    for (int i = 1; i <= 11; i++) {
        float weight = getGaussianWeight(i);
        // Calculate offset (mix 0.005 to 0.015, scaled by i/11)
        float offset = mix(0.005, 0.015, 0.5500) * float(i) / 11.;
        
        vec4 sample1 = texture(uTexture, uv + offset * dir);
        vec4 sample2 = texture(uTexture, uv - offset * dir);
        
        color += (sample1 + sample2) * weight;
        total_weight += 2.0 * weight;
    }
    return color / total_weight; // Normalize
}

// Pass 1: Horizontal Blur (dir = vec2(1, 0))
// Pass 2: Vertical Blur (dir = vec2(0, 1))

// ... main() for Pass 1 uses blur(uv, vec2(1, 0))
// ... main() for Pass 2 uses blur(uv, vec2(0, 1))
// 4. Fragment Shader Pass 0: Normal Map GenerationThis pass uses the blurred height map (from Pass 2) to calculate the surface normal, which is essential for realistic lighting and refraction. The output (Normal vector $\vec{N}$) is stored in the RGB channels.
// OpenGL Shading Language
#version 300 es
precision highp float;

in vec2 vTextureCoord;
in vec3 vVertexPosition;

// Uniforms
uniform sampler2D uPingPongTexture; // Blurred Height Map (Output of Pass 2)

out vec4 fragColor;

// ... (utility functions) ...

vec3 calculateNormal(sampler2D tex, vec2 uv) {
    // --- Scale Parameters ---
    float stengthScale = mix(3., 7., 0.6000);
    float stepScale = mix(1., 3., 0.6000);
    float strength = mix(1., stengthScale, 0.5000); // Strength of the normal vector
    float stepSize = mix(1., stepScale, 0.5000); // Sampling distance
    
    float step = stepSize / 1080.; // Normalized step size
    
    // --- Sample Height Neighbors ---
    // Samples the red channel (Height) of the blurred texture
    float left = texture(tex, uv + vec2(-step, 0.0)).r;
    float right = texture(tex, uv + vec2(step, 0.0)).r;
    float top = texture(tex, uv + vec2(0.0, -step)).r;
    float bottom = texture(tex, uv + vec2(0.0, step)).r;
    
    // --- Calculate Normal Vector (Finite Difference) ---
    vec3 normal;
    normal.x = (right - left) * strength;     // dH/dx
    normal.y = -(bottom - top) * strength;    // dH/dy (inverted Y axis)
    normal.z = -1.0;                          // Z is negative (surface pointing towards viewer)
    
    return normalize(normal);
}

vec4 drawRipple(vec2 uv) {
    // Scales the UV region (same scale 0.6000 as simulation)
    vec2 scaled = mix(uv, (uv - 0.5) * 0.5 + 0.5, 0.6000);
    vec3 normal = calculateNormal(uPingPongTexture, scaled);
    
    // Output the normal vector (RGB = Nxyz)
    return vec4(normal, 1.);
}

// ... main() calls getColor() -> drawRipple()
// 5. Fragment Shader Pass 3: Render (Refraction and Lighting)This is the final compositing pass, using the Normal Map (output of Pass 0) and the background texture (uBgTexture) to create the realistic water look.
// OpenGL Shading Language
#version 300 es
precision highp float;

in vec2 vTextureCoord;
in vec3 vVertexPosition;

// Uniforms
uniform sampler2D uTexture;     // Normal Map (Output of Pass 0)
uniform sampler2D uBgTexture;   // Original Background Image

out vec4 fragColor;

// ... (utility functions and constants) ...

// --- Refraction ---

// Calculates the 2D offset for refraction using Snell's Law
vec2 calculateRefraction(vec3 normal, float ior) {
    vec3 I = vec3(0.0, 0.0, 1.0); // Incident view vector (looking straight down)
    float ratio = 1.0 / ior;      // Inverse Index of Refraction (e.g., 1.0 / 1.333)
    
    // Calculates the refracted vector
    vec3 refracted = refract(I, normal, ratio); 
    
    // Scales the refraction amount
    float refractionScale = mix(0.2, 0.4, 0.6000);
    float refractionAmount = mix(0.01, refractionScale, 0.5000);
    
    return refracted.xy * refractionAmount; // Return X and Y offset for UV lookup
}

// --- Lighting (Simplified Phong Model) ---

vec3 calculateLighting(vec3 normal, vec2 uv) {
    vec3 N = normal;
    vec3 worldPos = vec3(uv * 2.0 - 1.0, 0.0); // Map UV to a plane in world space
    
    // Standard lighting vectors
    vec3 lightDir = normalize(LIGHT_POS - worldPos);
    vec3 viewDir = normalize(VIEW_POS - worldPos);
    vec3 reflectDir = reflect(-lightDir, N);
    
    // Diffuse component (Lambertian)
    float diff = max(dot(N, lightDir), 0.0);
    vec3 diffuse = vec3(diff);
    
    // Specular component (Phong/Blinn-Phong)
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), SHININESS);
    vec3 specular = vec3(spec * SPECULAR);
    
    return diffuse + specular; // Ambient is implicitly 0
}

// --- Ripple Rendering ---

vec4 getRipple(vec2 uv) {
    // 1. Refraction
    vec3 normal = texture(uTexture, uv).rgb; // Get normal from Pass 0 output
    vec2 refractionOffset = calculateRefraction(normal, 1.333); // IOR 1.333 is water
    vec2 refractedUv = uv + refractionOffset;
    
    // 2. Chromatic Aberration & Refracted Color Sample
    vec4 refractedColor = texture(uBgTexture, refractedUv);
    refractedColor.rgb = chromatic_aberration(refractedColor.rgb, refractedUv);
    
    // 3. Lighting (Caustics/Specular)
    vec3 refractedNormal = texture(uTexture, refractedUv).rgb; // Sample normal at refracted UV
    vec3 caustics = calculateLighting(refractedNormal, refractedUv);
    
    // Simple Shadow Factor (Likely an approximation of a caustic shadow or absorption)
    float causticsShadow = dot(normal, normalize(vec3(2.0, -2.0, 3.0) - vec3(uv * 2.0 - 1.0, 0.0))) + 1.;
    
    float shadowFactor = causticsShadow;
    vec3 lightingFactor = caustics;
    
    // Blend final lighting/shadow factors
    shadowFactor = mix(1., shadowFactor, 0.5000);
    lightingFactor = mix(vec3(0), lightingFactor * vec3(1, 1, 1), 0.5000);
    
    // 4. Final Composite
    // Color = Refracted Color - (Absorption/Shadow) + Lighting
    vec4 finalColor = vec4(refractedColor.rgb - vec3(1. - shadowFactor) * vec3(1, 1, 1) + lightingFactor, refractedColor.a);
    
    return finalColor;
}

// ... main() calls getColor() -> getRipple()
```

## File: extracted/distort/waves
```
// This is a very interesting setup! The Vertex Shader is doing the heavy lifting by calculating Perlin noise to deform the mesh (a "noise field" or "wave") and then adjusting the texture coordinates, while the Fragment Shader is extremely minimal, only mirroring the UVs and sampling the texture.

// Here is the formatted code for your "noisefield" shader.

// 1. Fragment Shader
// This shader is primarily responsible for sampling the texture after the vertex shader has calculated the position and UV distortion.

// OpenGL Shading Language

#version 300 es
precision mediump float;

// Inputs
in vec3 vVertexPosition;
in vec2 vTextureCoord;

// Uniforms
uniform sampler2D uTexture;

// Output
out vec4 fragColor;

void main() {
    vec2 uv = vTextureCoord;
    
    // Mirror UVs on both axes
    uv = vec2(
        1. - uv.x,
        1. - uv.y
    );
    
    vec4 color = texture(uTexture, uv);
    fragColor = color;
}

// 2. Vertex Shader
// This shader implements 3D Perlin noise to calculate a wave-like deformation on the mesh (likely a quad or plane) and also warps the texture coordinates.

// OpenGL Shading Language

#version 300 es
precision mediump float;

// Attributes
in vec3 aVertexPosition;
in vec2 aTextureCoord;

// Uniforms
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform float uTime;
uniform vec2 uResolution;

// Outputs
out vec3 vVertexPosition;
out vec2 vTextureCoord;

// --- Helper Functions (Noise) ---

// Hashing function for Perlin Noise
vec3 hash33(vec3 p3) {
    p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));
    p3 += dot(p3, p3.yxz + 19.19);
    return -1.0 + 2.0 * fract(vec3(
        (p3.x + p3.y) * p3.z,
        (p3.x + p3.z) * p3.y,
        (p3.y + p3.z) * p3.x
    ));
}

// 3D Perlin Noise function
float perlin_noise(vec3 p) {
    vec3 pi = floor(p);
    vec3 pf = p - pi;
    
    // Quintic interpolation curve
    vec3 w = pf * pf * (3.0 - 2.0 * pf);
    
    // Gradients (8 corners)
    float n000 = dot(pf - vec3(0.0, 0.0, 0.0), hash33(pi + vec3(0.0, 0.0, 0.0)));
    float n100 = dot(pf - vec3(1.0, 0.0, 0.0), hash33(pi + vec3(1.0, 0.0, 0.0)));
    float n010 = dot(pf - vec3(0.0, 1.0, 0.0), hash33(pi + vec3(0.0, 1.0, 0.0)));
    float n110 = dot(pf - vec3(1.0, 1.0, 0.0), hash33(pi + vec3(1.0, 1.0, 0.0)));
    float n001 = dot(pf - vec3(0.0, 0.0, 1.0), hash33(pi + vec3(0.0, 0.0, 1.0)));
    float n101 = dot(pf - vec3(1.0, 0.0, 1.0), hash33(pi + vec3(1.0, 0.0, 1.0)));
    float n011 = dot(pf - vec3(0.0, 1.0, 1.0), hash33(pi + vec3(0.0, 1.0, 1.0)));
    float n111 = dot(pf - vec3(1.0, 1.0, 1.0), hash33(pi + vec3(1.0, 1.0, 1.0)));
    
    // Interpolation (Trilinear)
    float nx00 = mix(n000, n100, w.x);
    float nx01 = mix(n001, n101, w.x);
    float nx10 = mix(n010, n110, w.x);
    float nx11 = mix(n011, n111, w.x);
    
    float nxy0 = mix(nx00, nx10, w.y);
    float nxy1 = mix(nx01, nx11, w.y);
    
    float nxyz = mix(nxy0, nxy1, w.z);
    
    return nxyz;
}

// Rotation matrix for model-view-projection
mat4 rotation(float angle) {
    return mat4(
        vec4( cos(angle), -sin(angle), 0.0, 0.0 ),
        vec4( sin(angle),  cos(angle), 0.0, 0.0 ),
        vec4( 0.0, 0.0, 1.0, 0.0 ),
        vec4( 0.0, 0.0, 0.0, 1.0 ) 
    );
}

// --- Main ---

void main() {
    vec3 vertexPosition = aVertexPosition;
    vec3 waveCoord = aVertexPosition;
    
    // This value is not used in the final computation but was likely part of a cumulative sum
    // float cumval = 0.; 
    
    // Calculate noise properties
    float spr = (0.7960 + 1.) / ((uResolution.x/uResolution.y + 1.) * 0.5) * 10.;
    float time = 0.0000 * 10. + uTime * 0.05;
    
    // Calculate the noise value
    float value = perlin_noise(vec3(
        ((waveCoord.xy * 0.7960 * 10.) + (vec2(0.5, 0.5) - 0.5) * 20. * 0.7960) * (vec2(0.2, 1.)), 
        time
    )) * 0.1600;
    
    // --- Apply Deformation to Mesh ---
    
    waveCoord.z = 0.; // Explicitly setting Z to zero before displacement
    
    // Displace Y-coordinate
    // The distortion function is: mix(value, smoothstep(-1., 0., value) - 1., 0.5000)
    waveCoord.y += mix(value, smoothstep(-1., 0., value) - 1., 0.5000);
    
    // Displace X-coordinate (very slight)
    waveCoord.x += value * 0.02;
    
    // Boundary Conditions: Prevents distortion at the mesh edges (x=-1, x=1, y=-1, y=1)
    // This pins the corners of the mesh to their original positions.
    if(vertexPosition.x == 1.) {
        waveCoord.x = 1.;
    }
    if(vertexPosition.x == -1.) {
        waveCoord.x = -1.;
    }
    if(vertexPosition.y == 1.) {
        waveCoord.y = 1.;
    }
    if(vertexPosition.y == -1.) {
        waveCoord.y = -1.;
    }
    
    // Set final position after deformation
    // Note the rotation of 180 degrees is applied here
    gl_Position = uPMatrix * uMVMatrix * rotation(radians(180.0)) * vec4(waveCoord, 1.);
    
    // --- Apply Distortion to Texture UVs ---
    
    // Texture coordinates are also displaced, which counteracts the vertex movement
    vTextureCoord = aTextureCoord - vec2(0., mix(value, smoothstep(-1., 0., value) - 1., 0.5000));
    
    // Pass original position to fragment shader
    vVertexPosition = vertexPosition;
}
// Summary of the Effect
// The Vertex Shader is creating an animated, undulating wave effect that primarily deforms the mesh along the Y-axis. The noise is 3D, with the Z-axis being driven by uTime to create continuous movement.

// The most unique part is the boundary clamping, which ensures the edges of the mesh remain straight, anchoring the wave effect within the quad.

// The Fragment Shader simply mirrors the texture, so the final output will be a wavy, animated texture that is flipped horizontally and vertically.

// This setup would typically be used for effects like:

// A wavy flag or banner.

// A stylized water surface.

// A procedural, animated cloth simulation.

// If you are seeing an issue with the final rendered image, you might try removing the rotation(radians(180.0)) in the gl_Position calculation, as it forces the entire scene to be upside down and mirrored, which might be unintended.
```

## File: extracted/light/2DLight
```
// This shader implements a Screen-Space 2D Point Light effect using a technique similar to Ray Marching or Visibility Testing to determine shadowing and light contribution based on the input scene texture (uTexture).

// 1. Vertex Shader (Shared)
// OpenGL Shading Language

#version 300 es
precision mediump float;

// Attributes
in vec3 aVertexPosition;
in vec2 aTextureCoord;

// Uniforms
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat4 uTextureMatrix;

// Outputs
out vec2 vTextureCoord;
out vec3 vVertexPosition;

void main() {
    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
    vTextureCoord = (uTextureMatrix * vec4(aTextureCoord, 0.0, 1.0)).xy;
}

// 2. Fragment Shader (2D Light Visibility)
// This pass raymarches from the current pixel towards a light source to detect objects (defined by color differences in the input texture) and calculates a light falloff, which is then blended with the scene.

// OpenGL Shading Language

#version 300 es
precision mediump float;

// Inputs
in vec2 vTextureCoord;

// Uniforms
uniform sampler2D uTexture;    // Scene texture (used for visibility test/color)
uniform sampler2D uBlueNoise;  // Used for dithering the ray direction
uniform vec2 uMousePos;
uniform vec2 uResolution;
uniform float uTime;

// Output
out vec4 fragColor;

// Constants
const float PI2 = 6.28318530718;
const float TAU = 6.28318530718;
const float EPSILON = 0.0001;

// --- Utility Functions ---

// Simple Random float generator
float random(vec2 seed) {
    return fract(sin(dot(seed.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

// Hyperbolic Tangent Tonemapping
vec3 Tonemap_tanh(vec3 x) {
    x = clamp(x, -40.0, 40.0);
    return (exp(x) - exp(-x)) / (exp(x) + exp(-x));
}

// Get directional offset from Blue Noise texture (used for jittering rays/soft shadows)
float getBlueNoiseOffset(vec2 st) {
    ivec2 texSize = textureSize(uBlueNoise, 0);
    
    // Calculate UV to sample Blue Noise (tiled and scaled by aspect ratio)
    vec4 blueNoise = texelFetch(uBlueNoise, 
        ivec2(fract(st * (uResolution) / vec2(texSize) * vec2(float(texSize.x) / float(texSize.y), 1.0)) * vec2(texSize)) % texSize, 
        0);
        
    float blueNoiseSample = blueNoise.r;
    
    // Return an angle (0 to TAU) based on the noise sample + time offset
    return mod((blueNoiseSample * PI2) + (uTime * (1.0 / PI2)), PI2);
}

// --- Main Function ---

void main() {
    vec4 sceneColor = texture(uTexture, vTextureCoord);
    
    // Aspect Ratio correction vector (normalized by the smaller dimension)
    vec2 aspectRatio = uResolution / min(uResolution.x, uResolution.y);
    vec2 uv = vTextureCoord * aspectRatio; // Corrected UV
    
    // Light position (fixed at center, mouse control disabled with 0.0000)
    vec2 pos = vec2(0.5, 0.5) + mix(vec2(0), (uMousePos - 0.5), 0.0000);
    pos = pos * aspectRatio; // Corrected light position
    
    vec2 lightDir = normalize(pos - uv); // Direction from pixel to light

    bool hitObject = false;
    vec2 marchPos = uv; // Current position along the ray
    float rayDist = 0.; // Normalized distance to hit point
    
    // --- Jittering Setup ---
    float blueNoiseOffset = getBlueNoiseOffset(marchPos);
    vec2 rayDirOffset = vec2(cos(blueNoiseOffset), sin(blueNoiseOffset)); // Jitter direction
    float diffusion = 0.5000 * 0.125;
    
    // --- Raymarch Parameters ---
    float lightDist = length(pos - uv); // Total distance to the light
    float cappedScale = min(1.8, 0.5000); // Step size scale factor
    float ambient = 0.;
    
    // Calculate final jittered step vector
    vec2 offset = rayDirOffset * diffusion * blueNoiseOffset * 0.25;
    vec2 step = (lightDir + offset) * 0.01 * cappedScale;
    
    vec3 prevColor = vec3(0.0);
    
    // --- Ray March Loop ---
    for(int i = 1; i < 64; i++) {
        float marchDist = length(marchPos - uv);
        
        // Advance ray: The step size is modulated by the distance already traveled
        marchPos += step * mix(marchDist, 1., 0.4);
        
        // Sample the scene texture (must normalize back to [0, 1] UV space for texture sample)
        vec4 texColor = texture(uTexture, marchPos / aspectRatio);
        
        // Calculate normalized distance traveled so far
        rayDist = marchDist / lightDist;
        
        vec3 color = texColor.rgb;
        
        // Visibility Test: If the current color is significantly different from the previous sampled color
        float colorDiff = length(color - prevColor);
        bool hit = colorDiff > 0.2500;
        
        if (hit && !hitObject) {
            hitObject = true;
            prevColor = color;
            
            // If the hit point is closer than the light source, this pixel is in shadow
            if(marchDist < lightDist) {
                break; // Exit loop, this ray is blocked
            }
        } else {
            // Decrement ambient light contribution if no hit or hit already occurred
            ambient -= 0.01;
        }
    }
    
    // --- Lighting Calculation ---
    
    // Final ray distance modulation (mixes normalized distance with absolute distance)
    rayDist = mix(rayDist * lightDist, rayDist, 0.5000 * 1.5);
    
    // Light Color Interpolation: Mixes fixed light color (Pink/Purple) with texture color * light color
    // The mix factor is based on visibility (1 - rayDist) and accumulated ambient loss.
    vec3 lightColor = mix(vec3(0.98, 0.12, 0.89), 
                          sceneColor.rgb * vec3(0.98, 0.12, 0.89), 
                          (1. - rayDist + ambient * 0.5000));
                          
    // Apply lighting to the scene color (multiplication) and Tonemapping
    lightColor = Tonemap_tanh(sceneColor.rgb * lightColor);
    
    // Add Dithering
    float dither = (random(gl_FragCoord.xy) - 0.5) / 255.0;
    lightColor += dither;
    
    vec4 color = vec4(lightColor, 1.);
    fragColor = color;
}
```

## File: extracted/light/aurora
```
// This shader generates a procedural, animated Aurora Borealis (Northern Lights) effect using a technique based on multiple sampled distances to a simple Signed Distance Field (SDF), where the sample points are subjected to complex, time-animated turbulence. The generated aurora is then additively blended onto a background image.

// 1. Vertex Shader (Shared)
// OpenGL Shading Language

#version 300 es
precision mediump float;

// Attributes
in vec3 aVertexPosition;
in vec2 aTextureCoord;

// Uniforms
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat4 uTextureMatrix;

// Outputs
out vec2 vTextureCoord;
out vec3 vVertexPosition;

void main() {
    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
    vTextureCoord = (uTextureMatrix * vec4(aTextureCoord, 0.0, 1.0)).xy;
}
// 2. Fragment Shader (Aurora Generation Pass 0)
// OpenGL Shading Language

#version 300 es
precision mediump float;

// Inputs
in vec2 vTextureCoord;

// Uniforms
uniform sampler2D uTexture;       // Background texture
uniform sampler2D uCustomTexture; // Unused in this logic (checked with conditional)
uniform float uTime;
uniform vec2 uMousePos;
uniform vec2 uResolution;

// Output
out vec4 fragColor;

// Variables (Set during main execution, but declared globally in source)
ivec2 customTexSize;
float customTexAspect;

// Constants
const float PI = 3.14159265359;
const float TAU = 6.28318530718;
const float ITERATIONS = 36.; // Number of samples taken to draw the aurora

// --- Utility Functions ---

// Simple Addition Blend Mode
vec3 blend (int blendMode, vec3 src, vec3 dst) {
    return src + dst;
}

// PCG (Permuted Congruential Generator) for random number generation
uvec2 pcg2d(uvec2 v) {
    // ... (PCG2D logic) ...
    v = v * 1664525u + 1013904223u;
    v.x += v.y * v.y * 1664525u + 1013904223u;
    v.y += v.x * v.x * 1664525u + 1013904223u;
    v ^= v >> 16;
    v.x += v.y * v.y * 1664525u + 1013904223u;
    v.y += v.x * v.x * 1664525u + 1013904223u;
    return v;
}

// Random float generator
float randFibo(vec2 p) {
    uvec2 v = floatBitsToUint(p);
    v = pcg2d(v);
    uint r = v.x ^ v.y;
    return float(r) / float(0xffffffffu);
}

// Color Palette generator (4-vector smooth sine wave blend)
vec3 pal( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d ) {
    return a + b * cos( TAU * (c * t + d) );
}

// Reinhard Tonemapping
vec3 Tonemap_Reinhard(vec3 x) {
    x *= 4.;
    return x / (1.0 + x);
}

// Signed Distance Field (SDF) for a circle
float sdCircle(vec2 st, float r) {
    return length(st) - r;
}

// Get SDF value (always a circle in this implementation)
float getSdf(vec2 st, float iter, float md) {
    return sdCircle(st, 0.2200); // Fixed radius
}

// Turbulence/Displacement function (iterative rotation and sine wave perturbation)
vec2 turb(vec2 pos, float t, float it, float md, vec2 mPos) {
    mat2 rot = mat2(0.6, -0.8, 0.8, 0.6); // Rotation matrix
    float freq = mix(2., 15., 0.5000);   // Base frequency
    float amp = (0.5000) * md;           // Base amplitude (modulated by mouse distance 'md')
    float xp = 1.4;                      // Frequency multiplier per iteration
    float time = t * 0.1 + 0.0000;       // Time offset
    
    for(float i = 0.; i < 4.; i++) {
        // Calculate sine-wave based displacement
        vec2 s = sin(freq * ((pos - mPos) * rot) + i * time + it);
        
        // Apply displacement
        pos += amp * rot[0] * s / freq;
        
        // Update rotation matrix and multipliers for the next octave
        rot *= mat2(0.6, -0.8, 0.8, 0.6);
        amp *= mix(1., max(s.y, s.x), 0.0000); // Amplitude modulation disabled (0.0000)
        freq *= xp;
    }
    return pos;
}

// Luminance calculation
float luma(vec3 color) {
    return dot(color, vec3(0.299, 0.587, 0.114));
}

// --- Main Function ---

void main() {
    vec2 uv = vTextureCoord;
    vec4 bg = texture(uTexture, uv);
    
    // Custom Texture setup is skipped (1 == 0)
    // if(1 == 0) { ... } 
    
    vec3 pp = vec3(0.);    // "Pre-pass" accumulation (used for the ribbon structure)
    vec3 bloom = vec3(0.); // Bloom accumulation
    
    float t = uTime * 0.5 + 0.0000; // Time uniform
    vec2 aspect = vec2(uResolution.x / uResolution.y, 1);
    vec2 mousePos = mix(vec2(0), uMousePos - 0.5, 0.0000); // Mouse control disabled
    
    // Current UV coordinate centered and aspect-corrected
    vec2 pos = (uv * aspect - vec2(0.5, 0.5) * aspect);
    
    // Mouse distance calculation (disabled)
    float mDist = length(uv * aspect - uMousePos * aspect);
    float md = mix(1., smoothstep(1., 5., 1. / mDist), 0.0000); // md = 1.0 (no mouse influence)
    
    // Rotation is disabled (0.0000)
    float rotation = 0.0000 * -2.0 * 3.14159265359;
    mat2 rotMatrix = mat2(cos(rotation), -sin(rotation), sin(rotation), cos(rotation));
    pos = rotMatrix * pos;
    
    // --- 1. Iterative Aurora Construction (The "Ribbon" Effect) ---
    
    float bm = 0.05;
    // Sample a slightly earlier position for previous distance comparison
    vec2 prevPos = turb(pos, t, 0. - 1. / ITERATIONS, md, mousePos);
    
    float spacing = mix(1., TAU, 0.5000);
    float smoothing = 1.0000;

    // Iterate 36 times to build the aurora ribbon
    for(float i = 1.; i < ITERATIONS + 1.; i++) {
        float iter = i / ITERATIONS;
        
        // Turbulate the UV for the current step
        vec2 st = turb(pos, t, iter * spacing, md, mousePos);
        
        // Calculate SDF distance to the circle primitive
        float d = abs(getSdf(st, iter, md));
        
        // --- Dynamic Blur/Thickness Calculation ---
        
        // pd: Distance between the current turbulated point and the previous one
        float pd = distance(st, prevPos);
        prevPos = st;
        
        // Dynamic Blur/Thickness: Exponential growth based on pd. Higher pd = more blur.
        float dynamicBlur = exp2(pd * 2.0 * 1.4426950408889634) - 1.0; // 1.44... is 1/ln(2)
        
        // ds: Smoothstep to create the visible ribbon edge. 
        // Thickness is determined by the fixed blur (0.0000*bm) + dynamic blur.
        float ds = smoothstep(0., 0.0000 * bm + max(dynamicBlur * smoothing, 0.001), d);
        
        // --- Color and Accumulation ---
        
        // Color based on iteration index (iter) using a sine palette
        vec3 color = pal(iter * mix(0.1, 1.9, 0.2500) + 0.5000, 
                         vec3(0.5), vec3(0.5), vec3(1), vec3(0.56, 0.78, 0));
        
        // invd: Inverse distance for bloom calculation
        float invd = 1. / max(d + dynamicBlur, 0.001);
        
        // Accumulate the ribbon structure (ds-1 is negative, resulting in a dark center/light edge)
        pp += (ds - 1.) * color;
        
        // Accumulate bloom (clamped inverse distance)
        bloom += clamp(invd, 0., 250.) * color;
    }
    
    // --- 2. Final Post-Processing ---
    
    pp *= 1. / ITERATIONS;
    
    // Tone mapping on the bloom accumulation
    bloom = bloom / (bloom + 2e4); 

    // Combine: The ribbon structure (-pp) + scaled, toned bloom
    vec3 color = (-pp + bloom * 3. * 0.7500);
    color *= 1.2;
    
    // Apply dithering
    color += (randFibo(gl_FragCoord.xy) - 0.5) / 255.0;
    
    // Apply final Reinhard Tonemapping
    color = (Tonemap_Reinhard(color));
    
    // --- 3. Composite with Background ---
    
    vec4 auroraColor = vec4(color, 1.);
    
    // Additive blend the generated aurora onto the background
    auroraColor.rgb = blend(1, bg.rgb, auroraColor.rgb);
    
    // Final mix (mix factor is 1.0000, so it returns the auroraColor)
    auroraColor = vec4(mix(bg.rgb, auroraColor.rgb, 1.0000), max(bg.a, luma(auroraColor.rgb)));
    
    fragColor = auroraColor;
}
```

## File: extracted/light/beam
```
// This shader implements a dynamic Single Line/Beam effect, typically used as a post-processing pass to draw an animated, glowing, or scanning line over an existing scene.

// The effect uses vector projection and smooth stepping to create a bright, fading line with an inner core, and an animated traveling "phase" along its length.

// 1. Vertex Shader (Shared)
// OpenGL Shading Language

#version 300 es
precision mediump float;

// Attributes
in vec3 aVertexPosition;
in vec2 aTextureCoord;

// Uniforms
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat4 uTextureMatrix;

// Outputs
out vec2 vTextureCoord;
out vec3 vVertexPosition;

void main() {
    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
    vTextureCoord = (uTextureMatrix * vec4(aTextureCoord, 0.0, 1.0)).xy;
}

// 2. Fragment Shader (Beam Effect Pass 0)
// OpenGL Shading Language

#version 300 es
precision highp float;
precision highp int;

// Inputs
in vec2 vTextureCoord;

// Uniforms
uniform sampler2D uTexture;
uniform float uTime;
uniform vec2 uMousePos;

// Output
out vec4 fragColor;

// Constants
const float PI = 3.14159265359;
const float TWO_PI = 2.0 * PI;

// --- Utility Functions ---

// Simple Addition Blend Mode (src + dst)
vec3 blend (int blendMode, vec3 src, vec3 dst) {
    // In this specific implementation, blendMode 1 results in:
    return src + dst;
}

// PCG (Permuted Congruential Generator) for random number generation
uvec2 pcg2d(uvec2 v) {
    v = v * 1664525u + 1013904223u;
    v.x += v.y * v.y * 1664525u + 1013904223u;
    v.y += v.x * v.x * 1664525u + 1013904223u;
    v ^= v >> 16;
    v.x += v.y * v.y * 1664525u + 1013904223u;
    v.y += v.x * v.x * 1664525u + 1013904223u;
    return v;
}

// Random float generator
float randFibo(vec2 p) {
    uvec2 v = floatBitsToUint(p);
    v = pcg2d(v);
    uint r = v.x ^ v.y;
    return float(r) / float(0xffffffffu);
}

// Hyperbolic Tangent Tonemapping (compresses high values)
vec3 Tonemap_tanh(vec3 x) {
    x = clamp(x, -40.0, 40.0);
    return (exp(x) - exp(-x)) / (exp(x) + exp(-x));
}

// Luminance calculation for setting alpha
float luma(vec3 color) {
    return dot(color, vec3(0.299, 0.587, 0.114));
}

// --- Main Beam Logic ---

vec3 drawLine(vec2 uv, vec2 center, float scale, float angle) {
    // 1. Setup Direction and Animation Phase
    float radAngle = -angle * TWO_PI; // Convert normalized angle (0 to 1) to radians
    
    // Calculate animated phase offset along the line
    // Time (uTime * 0.01) + speed (0.5000) creates the traveling effect.
    float phase = fract(uTime * 0.01 + 0.5000) * (3. * max(1., scale)) - (1.5 * max(1., scale));
    
    vec2 direction = vec2(cos(radAngle), sin(radAngle)); // Normalized line direction
    
    vec2 centerToPoint = uv - center;
    
    // 2. Projection (Distance along the line) and Distance to Line
    
    // Projection: distance from the center point along the line's axis
    float projection = dot(centerToPoint, direction);
    
    // Distance to Line: shortest distance from the pixel to the line segment's axis
    float distToLine = length(centerToPoint - projection * direction);

    // 3. Create Line Profile (Width)
    
    float lineRadius = 0.5000 * 0.25;
    
    // Brightness decreases sharply as distance to line increases
    float brightness = lineRadius / (1. - smoothstep(0.4, 0., distToLine + 0.02));
    
    // 4. Create Glow (Traveling Phase)
    
    float glowRadius = scale;
    // Glow is max at `projection == phase` and fades out based on `glowRadius`
    float glow = smoothstep(glowRadius, 0.0, abs(projection - phase));

    // Final color calculation: (Width Profile) * (Fading Line Core) * (Color) * (Traveling Glow)
    return brightness * (1. - distToLine) * (1. - distToLine) * vec3(0.4, 0.1, 1) * glow;
}

vec3 getBeam(vec2 uv) {
    // Focus point is fixed at center (0.5, 0.5), mouse control disabled (0.0000)
    vec2 pos = vec2(0.5, 0.5) + mix(vec2(0), (uMousePos - 0.5), 0.0000);
    
    // Draw the line (scale=0.5000, angle=0.0000)
    return drawLine(uv, pos, 0.5000, 0.0000);
}

void main() {
    vec2 uv = vTextureCoord;
    vec4 bg = texture(uTexture, uv); // Existing scene color
    
    vec3 beam = getBeam(uv); // Generated beam color
    
    // Dithering (adds small noise to reduce banding, mostly visible in low-bit-depth output)
    float dither = (randFibo(gl_FragCoord.xy) - 0.5) / 255.0;
    
    // Blending: Tonemap the generated beam, then add it to the background color (blendMode 1 is addition)
    vec3 blended = blend(1, Tonemap_tanh(beam), bg.rgb);
    
    // Final result mix (mix factor is 1.0000, so it always uses the blended color)
    vec3 result = mix(bg.rgb, blended, 1.0000);
    
    result += dither;
    
    // Set color and calculate alpha: alpha is the max of the existing alpha and the beam's luminance
    vec4 color = vec4(result, max(bg.a, luma(beam)));
    fragColor = color;
}
```

## File: extracted/light/lightTrail
```
// This set of shaders implements a sophisticated Light Trail / Mouse Trail effect using a Ping-Pong Buffer technique.

// Fragment Shader 1 (Ping-Pong / Trail Generation): Calculates the new trail segment, fades the previous trail, and adds a blur, then writes the result. This pass runs repeatedly, feeding its output back as input (uPingPongTexture) to create the persistent trail.

// Fragment Shader 0 (Final Composite): Reads the generated trail and blends it onto the final scene (uTexture), applying a subtle parallax distortion.

// 1. Vertex Shaders (Shared)
// The vertex shaders are standard full-screen quad setups, with slight variation in uniform usage.

// OpenGL Shading Language

// Vertex Shader (Common for Pass 0)
#version 300 es
precision mediump float;

in vec3 aVertexPosition;
in vec2 aTextureCoord;

uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat4 uTextureMatrix;

out vec2 vTextureCoord;
out vec3 vVertexPosition;

void main() {
    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
    vTextureCoord = (uTextureMatrix * vec4(aTextureCoord, 0.0, 1.0)).xy;
}
// OpenGL Shading Language

// Vertex Shader (Common for Pass 1 - Simplified)
#version 300 es
precision mediump float;

in vec3 aVertexPosition;
in vec2 aTextureCoord;

uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
// uTextureMatrix is missing, implying vTextureCoord is simply aTextureCoord

out vec2 vTextureCoord;
out vec3 vVertexPosition;

void main() {
    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
    vTextureCoord = aTextureCoord;
}
// 2. Fragment Shader 1 (Ping-Pong Buffer / Trail Update)
// This is the core pass that draws the new light trail and fades the old one.

// OpenGL Shading Language

#version 300 es
precision highp float;
precision highp int;

// Inputs
in vec3 vVertexPosition;
in vec2 vTextureCoord;

// Uniforms
uniform sampler2D uPingPongTexture; // Previous frame/trail
uniform vec2 uPreviousMousePos;
uniform float uTime;
uniform vec2 uMousePos;
uniform vec2 uResolution;

// Output
out vec4 fragColor;

// Constants
const float PI = 3.1415926;
const float TWOPI = 6.2831852;

// --- Utility Functions ---

// HSV to RGB conversion
vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// RGB to HSV conversion
vec3 rgb2hsv(vec3 c) {
    // ... (standard RGB to HSV logic) ...
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

mat2 rot(float a) {
    return mat2(cos(a), -sin(a), sin(a), cos(a));
}

vec2 angleToDir(float angle) {
    float rad = angle * 2.0 * PI;
    return vec2(cos(rad), sin(rad));
}

// Complex distortion/swirl effect applied to the previous frame's UV
vec2 liquify(vec2 st, vec2 dir) {
    float aspectRatio = uResolution.x / uResolution.y;
    st.x *= aspectRatio;
    float amplitude = 0.0025;
    float freq = 6.;
    
    for (float i = 1.0; i <= 5.0; i++) {
        st = st * rot(i / 5.0 * PI * 2.0);
        st += vec2(
            amplitude * cos(i * freq * st.y + uTime * 0.02 * dir.x),
            amplitude * sin(i * freq * st.x + uTime * 0.02 * dir.y)
        );
    }
    
    st.x /= aspectRatio;
    return st;
}

// Calculates the contribution of a single line segment to the current pixel
vec3 calculateTrailContribution(vec2 mousePos, vec2 prevMousePos, vec2 uv, vec2 correctedUv, float aspectRatio, float radius) {
    // Calculate direction of mouse movement (aspect-corrected)
    vec2 dir = (mousePos - prevMousePos) * vec2(aspectRatio, 1.0);
    float angle = atan(dir.y, dir.x);
    if (angle < 0.0) angle += TWOPI;
    
    vec2 mouseVec = mousePos - prevMousePos;
    float mouseLen = length(mouseVec);
    vec2 mouseDir = mouseLen > 0.0 ? mouseVec / mouseLen : vec2(0.0);
    
    // Vector from previous mouse position to current pixel (uv)
    vec2 posToUv = (correctedUv - prevMousePos) * vec2(aspectRatio, 1.0);
    
    // Projection: distance along the mouse path
    float projection = clamp(dot(posToUv, mouseDir * vec2(aspectRatio, 1.0)), 0.0, mouseLen * aspectRatio);
    
    // Closest point on the mouse path segment to the current pixel
    vec2 closestPoint = prevMousePos * vec2(aspectRatio, 1.0) + mouseDir * vec2(aspectRatio, 1.0) * projection;
    
    // Distance from pixel to the path segment
    float distanceToLine = distance(correctedUv, closestPoint);
    
    // Inverse distance squared falloff (s)
    float s = (1.0 + radius) / (distanceToLine + radius) * radius;
    
    // Trail color based on angle (HSV Hue)
    vec3 color = vec3(angle / TWOPI, 1.0, 1.0);
    vec3 pointColor = hsv2rgb(color);
    pointColor = pow(pointColor, vec3(2.2)); // Gamma correct trail color
    
    // Intensity is a sharp falloff of the inverse distance (s)
    float intensity = pow(s, 10.0 * (1. - 0.5000 + 0.1));
    
    return pointColor * intensity;
}

void main() {
    float aspectRatio = uResolution.x / uResolution.y;
    vec2 uv = vTextureCoord;
    vec2 correctedUv = (uv) * vec2(aspectRatio, 1.0);

    // --- 1. Trail Decay (Fading and Liquify) ---
    
    // Read previous frame's color (the trail itself)
    vec3 lastFrameColor = texture(uPingPongTexture, uv).rgb;
    vec3 lastFrameColorGamma = pow(lastFrameColor, vec3(2.2)); // Gamma correct for calculations
    
    // Extract properties from the previous frame's color (to guide the motion)
    vec3 hsv = rgb2hsv(lastFrameColor);
    vec3 hsvGamma = rgb2hsv(lastFrameColorGamma);
    vec2 prevDir = angleToDir(hsv.x); // Direction from last frame's color hue
    float prevStrength = hsvGamma.z;   // Strength from last frame's color value
    
    // Apply a simple blur/offset based on the previous frame's direction (smears the trail)
    float blurAmount = 0.03 * prevStrength;
    uv = uv - prevDir * blurAmount;
    
    // Apply "liquify" distortion to the UV based on previous strength (creates distortion when fading)
    uv = mix(uv, liquify(uv - prevDir * 0.005, prevDir), (1. - prevStrength) * 0.2500);
    
    // Sample the previous frame *again* with the blurred/distorted UV
    lastFrameColor = texture(uPingPongTexture, uv).rgb;
    lastFrameColor = pow(lastFrameColor, vec3(2.2));
    
    // --- 2. New Trail Generation ---
    
    vec2 dir = (uMousePos - uPreviousMousePos) * vec2(aspectRatio, 1.0);
    float dist = length(dir);
    
    // Calculate new trail segment parameters
    int numPoints = int(max(12.0, dist * 24.0)); // Interpolation quality
    float speedFactor = clamp(dist, 0.7, 1.3);
    float radius = mix(0.1, 0.7, 0.5000 * speedFactor);
    
    // Interpolate mouse movement and calculate accumulated contribution
    vec3 trailColor = vec3(0.0);
    int iter = min(numPoints, 24);
    
    for (int i = 0; i <= iter; i++) {
        float t = float(i) / float(numPoints);
        vec2 interpPos = mix(uPreviousMousePos, uMousePos, t);
        vec2 prevInterpPos = i > 0 ? mix(uPreviousMousePos, uMousePos, float(i-1) / float(numPoints)) : uPreviousMousePos;
        
        trailColor += calculateTrailContribution(interpPos, prevInterpPos, uv, correctedUv, aspectRatio, radius);
    }
    
    trailColor = trailColor / float(min(numPoints, 50) + 1); // Normalize accumulated color

    // --- 3. Blur the Last Frame (Trail Fading / Smearing) ---
    
    vec3 blurredLastFrame = vec3(0.0);
    float clampedDist = clamp(length(trailColor) * dist, 0.0, 1.0); // Mix factor based on new trail strength/speed
    float blurRadius = 0.005;
    
    // Simple 5-tap box blur on the previous frame (after decay/liquify)
    blurredLastFrame += pow(texture(uPingPongTexture, uv + vec2(blurRadius, 0.0)).rgb, vec3(2.2)) * 0.2;
    blurredLastFrame += pow(texture(uPingPongTexture, uv + vec2(-blurRadius, 0.0)).rgb, vec3(2.2)) * 0.2;
    blurredLastFrame += pow(texture(uPingPongTexture, uv + vec2(0.0, blurRadius)).rgb, vec3(2.2)) * 0.2;
    blurredLastFrame += pow(texture(uPingPongTexture, uv + vec2(0.0, -blurRadius)).rgb, vec3(2.2)) * 0.2;
    blurredLastFrame += lastFrameColor * 0.2; // Central sample
    
    blurredLastFrame *= pow(0.5000, 0.2); // Overall decay/fade factor

    // --- 4. Composite ---
    
    // Blend the newly generated trail (trailColor) over the smeared/faded old trail (blurredLastFrame)
    vec3 draw = mix(blurredLastFrame, trailColor, clampedDist);
    
    // Gamma correction back to LDR space (1.0/2.2)
    draw = pow(draw, vec3(1.0/2.2));
    
    // Simple minimum color clamp (reduces residual color)
    draw.r = max(0.0, draw.r - 0.01);
    draw.g = max(0.0, draw.g - 0.01);
    draw.b = max(0.0, draw.b - 0.01);
    
    fragColor = vec4(draw, 1.0);
}
// 3. Fragment Shader 0 (Final Composite Pass)
// This pass takes the persistent, glowing trail from the Ping-Pong buffer and combines it with the original scene texture (uTexture).

// OpenGL Shading Language

#version 300 es
precision highp float;
precision highp int;

// Inputs
in vec2 vTextureCoord;
in vec3 vVertexPosition;

// Uniforms
uniform sampler2D uTexture;         // Original scene texture
uniform sampler2D uPingPongTexture; // Trail texture (from Pass 1)

// Output
out vec4 fragColor;

// Constants
const float PI = 3.1415926;

// --- Utility Functions ---

// Simple Addition Blend Mode
vec3 blend (int blendMode, vec3 src, vec3 dst) {
    return src + dst;
}

// Random float generator
uvec2 pcg2d(uvec2 v) {
    // ... (PCG2D logic) ...
    v = v * 1664525u + 1013904223u;
    v.x += v.y * v.y * 1664525u + 1013904223u;
    v.y += v.x * v.x * 1664525u + 1013904223u;
    v ^= v >> 16;
    v.x += v.y * v.y * 1664525u + 1013904223u;
    v.y += v.x * v.x * 1664525u + 1013904223u;
    return v;
}
float randFibo(vec2 p) {
    uvec2 v = floatBitsToUint(p);
    v = pcg2d(v);
    uint r = v.x ^ v.y;
    return float(r) / float(0xffffffffu);
}

// RGB to HSV conversion (used to extract color properties from trail)
vec3 rgb2hsv(vec3 c) {
    // ... (standard RGB to HSV logic) ...
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec2 angleToDir(float angle) {
    float rad = angle * 2.0 * PI;
    return vec2(cos(rad), sin(rad));
}

void main() {
    vec2 uv = vTextureCoord;
    vec2 pingpongUv = uv;

    // --- 1. Trail Properties and Parallax ---

    vec3 mouseRgb = texture(uPingPongTexture, pingpongUv).rgb;
    vec3 mouseTrail = rgb2hsv(mouseRgb);
    
    float angle = mouseTrail.x;
    float strength = mouseTrail.z * (0.5000 * 5.0); // Scale trail strength
    
    vec2 direction = angleToDir(angle);
    
    // Apply a parallax/offset to the background texture based on trail properties
    // The offset is small (0.1 * strength), but the 0.0000 factor disables it effectively.
    vec4 bg = texture(uTexture, uv - (direction * 0.1 * strength * 0.0000));
    
    // --- 2. Trail Color and Blending ---
    
    vec4 color = vec4(0, 0, 0, 1);
    
    // Calculate the final trail color, blending the raw RGB trail with a fixed color (0, 0.51, 0.97)
    color.rgb = vec3(strength * mix(mouseRgb, vec3(0, 0.51, 0.97), 0.5000));
    
    float dither = (randFibo(gl_FragCoord.xy) - 0.5) / 255.0;

    // Blend the trail (color.rgb + dither) onto the background (bg.rgb)
    // The conditional (1 > 0) is always true, forcing the additive blend logic.
    if(1 > 0) {
        vec3 blendedRgb = blend(1, color.rgb + dither, bg.rgb); // Additive blend: trail + background
        
        // Final mix: blend the original background (bg.rgb) with the blended result (blendedRgb).
        // The mix factor is the trail value (mouseTrail.z), ensuring the blend only happens where the trail is bright.
        fragColor = vec4(mix(bg.rgb, blendedRgb, mouseTrail.z), 1.0);
    } else {
        fragColor = mix(bg, color, mouseTrail.z);
    }
}
```

## File: extracted/light/waterCaustics
```
// This shader implements a Water Caustics effect, which simulates the light patterns cast on a surface (like the bottom of a pool) by moving water. It uses a high-quality 3D noise function (specifically a variation of Body-Centered Cubic or BCC noise, possibly derived from Worley or similar noise types) to generate a constantly shifting, self-refracting pattern that is blended with the input scene.

// 1. Vertex Shader (Shared)
// OpenGL Shading Language

#version 300 es
precision mediump float;

// Attributes
in vec3 aVertexPosition;
in vec2 aTextureCoord;

// Uniforms
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat4 uTextureMatrix;

// Outputs
out vec2 vTextureCoord;
out vec3 vVertexPosition;

void main() {
    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
    vTextureCoord = (uTextureMatrix * vec4(aTextureCoord, 0.0, 1.0)).xy;
}

// 2. Fragment Shader (Caustics Generator and Composite)
// OpenGL Shading Language

#version 300 es
precision highp float;

// Inputs
in vec3 vVertexPosition;
in vec2 vTextureCoord;

// Uniforms
uniform sampler2D uTexture;
uniform float uTime;
uniform vec2 uMousePos;
uniform vec2 uResolution;

// Output
out vec4 fragColor;

// Constants
const float PI = 3.14159265359;

// --- Utility Functions for BCC Noise ---

// Permutation function (similar to classic Perlin/Simplex noise)
vec4 permute(vec4 t) {
    return t * (t * 34.0 + 133.0);
}

// Gradient generation function for BCC noise (uses a set of 48 pre-calculated vectors)
vec3 grad(float hash) {
    vec3 cube = mod(floor(hash / vec3(1.0, 2.0, 4.0)), 2.0) * 2.0 - 1.0;
    vec3 cuboct = cube;
    
    // Logic to select vectors for different lattice points
    float index0 = step(0.0, 1.0 - floor(hash / 16.0));
    float index1 = step(0.0, floor(hash / 16.0) - 1.0);
    cuboct.x *= 1.0 - index0;
    cuboct.y *= 1.0 - index1;
    cuboct.z *= 1.0 - (1.0 - index0 - index1);
    
    float type = mod(floor(hash / 8.0), 2.0);
    vec3 rhomb = (1.0 - type) * cube + type * (cuboct + cross(cube, cuboct));
    
    vec3 grad = cuboct * 1.22474487139 + rhomb; // 1.22... is sqrt(3/2)
    grad *= (1.0 - 0.042942436724648037 * type) * 3.5946317686139184;
    return grad;
}

// BCC Noise Derivatives (Part 1): Calculates noise and derivatives for a given lattice
vec4 bccNoiseDerivativesPart(vec3 X) {
    vec3 b = floor(X);
    vec4 i4 = vec4(X - b, 2.5);
    
    // Determine the 4 nearest lattice points (v1, v2, v3, v4)
    vec3 v1 = b + floor(dot(i4, vec4(.25)));
    // ... (v2, v3, v4 calculation based on BCC lattice structure)
    vec3 v2 = b + vec3(1, 0, 0) + vec3(-1, 1, 1) * floor(dot(i4, vec4(-.25, .25, .25, .35)));
    vec3 v3 = b + vec3(0, 1, 0) + vec3(1, -1, 1) * floor(dot(i4, vec4(.25, -.25, .25, .35)));
    vec3 v4 = b + vec3(0, 0, 1) + vec3(1, 1, -1) * floor(dot(i4, vec4(.25, .25, -.25, .35)));
    
    // Hashing (determines gradient vectors at the lattice points)
    vec4 hashes = permute(mod(vec4(v1.x, v2.x, v3.x, v4.x), 289.0));
    hashes = permute(mod(hashes + vec4(v1.y, v2.y, v3.y, v4.y), 289.0));
    hashes = mod(permute(mod(hashes + vec4(v1.z, v2.z, v3.z, v4.z), 289.0)), 48.0);
    
    // Distances (d) and Attenuation (a)
    vec3 d1 = X - v1; vec3 d2 = X - v2; vec3 d3 = X - v3; vec3 d4 = X - v4;
    vec4 a = max(0.75 - vec4(dot(d1, d1), dot(d2, d2), dot(d3, d3), dot(d4, d4)), 0.0);
    vec4 aa = a * a; vec4 aaaa = aa * aa;
    
    // Gradients (g) and Extrapolations (dot product of gradient and distance)
    vec3 g1 = grad(hashes.x); vec3 g2 = grad(hashes.y);
    vec3 g3 = grad(hashes.z); vec3 g4 = grad(hashes.w);
    vec4 extrapolations = vec4(dot(d1, g1), dot(d2, g2), dot(d3, g3), dot(d4, g4));
    
    // Noise Derivative Calculation (dNoise/dx, dNoise/dy, dNoise/dz)
    vec3 derivative = -8.0 * mat4x3(d1, d2, d3, d4) * (aa * a * extrapolations)
                    + mat4x3(g1, g2, g3, g4) * aaaa;
                    
    // Result: vec4(dNoise/dx, dNoise/dy, dNoise/dz, NoiseValue)
    return vec4(derivative, dot(aaaa, extrapolations));
}

// BCC Noise Derivatives (Part 2): Applies orthonormal mapping for isotropic noise
vec4 bccNoiseDerivatives_XYBeforeZ(vec3 X) {
    // Orthonormal transform matrix for BCC noise
    mat3 orthonormalMap = mat3(
        0.788675134594813, -0.211324865405187, -0.577350269189626,
        -0.211324865405187, 0.788675134594813, -0.577350269189626,
        0.577350269189626, 0.577350269189626, 0.577350269189626);
        
    X = orthonormalMap * X;
    
    // Two BCC lattices are typically summed to make the noise fully isotropic
    vec4 result = bccNoiseDerivativesPart(X) + bccNoiseDerivativesPart(X + 144.5);
    
    // Apply inverse transform to derivatives before returning
    return vec4(result.xyz * orthonormalMap, result.w);
}

// Easing function (disabled in this implementation)
float ease (int easingFunc, float t) {
    return t;
}

// Simple Addition Blend Mode
vec3 blend (int blendMode, vec3 src, vec3 dst) {
    return src + dst;
}

// Normalize noise value and its derivatives
vec4 normalizeNoise(vec4 noise, float amount) {
    // Mixes original noise with normalized noise ([0, 1] range)
    return mix(noise, (noise + 0.5) * 0.5, amount);
}

// 2D Rotation Matrix
mat2 rotate2d(float angle) {
    return mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
}

// Get final normalized BCC noise (including derivatives)
vec4 getNoise(vec3 p) {
    vec4 noise = bccNoiseDerivatives_XYBeforeZ(p);
    return normalizeNoise(noise, 0.2500); // 25% normalization
}


[Image of light refraction by water surface]


// --- Caustics Calculation ---

void getCaustics(vec2 uv, out vec4 outNoise, out vec3 outColor) {
    vec2 aspect = vec2(uResolution.x/uResolution.y, 1);
    
    // Mouse position (disabled with 0.0000)
    vec2 mPos = vec2(0.5, 0.5) + mix(vec2(0), (uMousePos - 0.5), 0.0000);
    
    // Water drift (disabled with 0.0000)
    vec2 drift = vec2(0, 0.0000 * uTime * 0.0125);
    vec2 pos = vec2(0.5, 0.5) + drift * rotate2d(0.0000 * -2. * PI);
    
    // Mouse distance mask (disabled with 0.0000 in mix and 1.0000 in 1-mDist)
    float mDist = ease(0, max(0., 1. - distance(uv * aspect, mPos * aspect) * 4. * (1. - 1.0000)));
    // if(0 == 1) { mDist = max(0., (0.5 - mDist)); } 
    mDist = 1.0; // Effectively set to 1.0 due to disabled mouse controls
    
    uv -= pos; // Center UV around the water's center point
    
    // Scale and Rotate UV for 3D Noise Sampling (Rotation and distortion disabled)
    uv = uv * aspect * rotate2d(0.0000 * 2. * PI) * vec2(1. - 0.0000, 1.) * 16.0 * 0.5000;
    
    float refraction = mix(0.25, 1.3, 0.5000); // Refraction strength (0.775)
    
    // 3D Noise Sample Point (p) - time acts as the Z axis for animation
    vec3 p = vec3(uv, uTime * 0.05);
    
    // --- Self-Refraction Effect (Caustics generation) ---
    
    // 1. Base Noise
    vec4 noise = getNoise(p);
    vec4 baseNoise = noise;
    
    // 2. Refracted Noise 1: Sample offset by the base noise's derivative (baseNoise.xyz)
    vec4 balanceNoise = getNoise(p - vec3(baseNoise.xyz / 32.0) * refraction);
    
    // 3. Refracted Noise 2: Sample offset by the derivative of the first refracted noise
    noise = getNoise(p - vec3(balanceNoise.xyz / 16.0) * refraction);
    
    // Balancer: Used to mix the caustic pattern strength (luminance of first refracted noise)
    float balancer = (0.5 + 0.5 * balanceNoise.w);
    
    // Caustic value (luminance of the final noise, squared for contrast)
    float normalized = pow(0.5 + 0.5 * noise.w, 2.);
    
    // Final Value: Blends the squared noise with a high-pass version, weighted by the balancer and mouse distance
    float value = mix(0., normalized + 0.2 * (1.0 - normalized), balancer * mDist);
    
    outNoise = baseNoise * mDist; // Noise and derivatives for texture perturbation
    outColor = vec3(0.6, 0.7, 0.9) * value; // Caustic color (light blue/purple) scaled by caustic value
}

// --- Main Composite ---

void main() {
    vec2 uv = vTextureCoord;
    vec4 causticNoise;
    vec3 causticColor;
    
    getCaustics(uv, causticNoise, causticColor);
    
    // Refraction/Distortion: Sample the background texture offset by the noise derivatives (causticNoise.xy)
    vec4 color = texture(uTexture, uv + causticNoise.xy * 0.01 * 0.2500);
    
    // Composite: Additive blend the caustic color onto the refracted background
    if(1 > 0) {
        vec3 blended = blend(1, color.rgb, causticColor); // Additive blend (src + dst)
        color.rgb = mix(color.rgb, blended, 1.0000);     // 100% blend strength
    } else {
        color.rgb = causticColor * 1.0000;
    }
    
    fragColor = color;
}
```

## File: extracted/misc/glitter
```
// This shader is designed to create a dynamic Glitter / Sparkle effect, often referred to as a "K-Buffer" or "Star-field" effect, by overlaying stylized, cross-shaped light flares onto a base texture. It uses a Voronoi/Cellular Noise approach to scatter the sparkle centers.

// 1. Vertex Shader (Shared)
// OpenGL Shading Language

#version 300 es
precision mediump float;

// Attributes
in vec3 aVertexPosition;
in vec2 aTextureCoord;

// Uniforms
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat4 uTextureMatrix;

// Outputs
out vec2 vTextureCoord;
out vec3 vVertexPosition;

void main() {
    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
    vTextureCoord = (uTextureMatrix * vec4(aTextureCoord, 0.0, 1.0)).xy;
}

// 2. Fragment Shader (Sparkle Generation and Composite)
// This pass contains the complex logic for generating cellular noise, calculating the sparkle shape (cross and bloom), and integrating it with the input texture.

// OpenGL Shading Language

#version 300 es
precision mediump float;

// Inputs
in vec2 vTextureCoord;

// Uniforms
uniform sampler2D uTexture;
uniform float uTime;
uniform vec2 uMousePos;
uniform vec2 uResolution;

// Output
out vec4 fragColor;

const float PI = 3.14159265359;

// --- Utility Functions ---

// Luma (luminance) calculation
float luma(vec4 color) {
    return 0.299 * color.r + 0.587 * color.g + 0.114 * color.b;
}

// Simple hash function for pseudo-random number generation (used for Voronoi offsets)
vec2 hash(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 18.5453);
}

// 2D Rotation Matrix
mat2 rot(float a) {
    return mat2(cos(a), -sin(a), sin(a), cos(a));
}

// Color utility to create cyclic hue
vec3 hue(float h, float angle) {
    const float PI = 3.14159265358979323846;
    return vec3(0.5) + 0.5 * cos(h + 2.0 * PI * angle + vec3(0, 2, 4));
}

// --- Star/Glitter Generation (Voronoi/Cellular Noise) ---

vec4 getStarLayer(vec2 baseUV, float scaleMult, vec2 offset) {
    // 1. Calculate aspect-corrected UV and scale factors
    vec2 scaleRatio = vec2(1080) * vec2(uResolution.x / uResolution.y, 1);
    vec2 pos = vec2(0.5, 0.5) + mix(vec2(0), (uMousePos - 0.5), 0.0000); // Mouse offset disabled
    
    // uv is the coordinate system for the Voronoi pattern
    vec2 uv = (baseUV - pos) * scaleRatio * 0.2500 * scaleMult * 0.01 * rot(0.0000 * PI * 2.) + offset; // Rotation disabled
    
    float time = (uTime * 0.001);
    vec2 i_uv = floor(uv); // Cell index
    vec2 f_uv = fract(uv); // Position within cell [0, 1]
    
    vec3 d = vec3(1e10); // Stores distance squared (d.x = F1, d.y = F2)
    vec2 closestPoint;
    vec2 point = vec2(0);

    // 2. Find the two closest cell centers (F1 and F2 Voronoi)
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 tile_offset = vec2(float(x), float(y));
            // Calculate random offset (the cell center) + animate over time
            vec2 o = hash(i_uv + tile_offset + vec2(time * 0.05));
            
            // Vector from current fragment to the potential cell center
            tile_offset += o - f_uv; 
            
            float dist = dot(tile_offset, tile_offset); // Distance squared
            
            if (dist < d.x) { // Found a new closest point (F1)
                d.y = d.x;
                d.x = dist;
                closestPoint = tile_offset;
                point = o;
            } else if (dist < d.y) { // Found a new second closest point (F2)
                d.y = dist;
            }
        }
    }
    
    d = sqrt(d);
    float r = sqrt(d.x);
    vec2 toCenter = closestPoint;
    vec2 toCenterRot45 = toCenter * rot(-PI/4.);
    
    // 3. Sample color from the texture at the sparkle center (for color grading)
    vec2 closestPointOriginal = closestPoint * rot(-abs(0.0000) * PI * 2.) / (0.2500 * scaleMult * 0.01) / scaleRatio + baseUV;
    vec4 closestPointCol = texture(uTexture, closestPointOriginal);
    float closestPointR = luma(closestPointCol); // Luma of the sparkle center
    
    // Mix threshold based on sparkle center luma
    float mixThresh = mix(1., closestPointR, 0.5000); 
    closestPointR = mixThresh;
    
    // 4. Calculate Sparkle Shape (Cross and Bloom)
    
    float proximityFactor = d.y - d.x; // F2 - F1 distance (controls intensity/size)
    
    // Radial Bloom
    float radialGradient = (1.0 - length(toCenter)) * closestPointR * (0.5000 * 1.5);
    float flare = 1.0 - smoothstep(-0.5, 1.0, 0.5000); // Flare disabled
    
    // Cross Shape (Manhattan distance/Chebyshev distance approximations)
    float crossShape;
    crossShape = min(abs(toCenter.x), abs(toCenter.y)); // Square/Diamond pattern
    // smoothstep creates the sharp cross shape. The edge is softened by proximity and brightness.
    crossShape = 1.0 - smoothstep(-0.04, 0.04 * (proximityFactor - flare) * closestPointR * closestPointR, crossShape);
    
    // Mix the cross with hue/color
    vec3 cross = mix(vec3(crossShape), vec3(crossShape) * hue(closestPointR, proximityFactor * 5.), 0.2500);
    
    // Bloom (soft glow)
    vec3 bloom = vec3(smoothstep(0., 4., radialGradient * proximityFactor));
    
    // 5. Final Color and Composite
    
    // Mix between white and the sparkle center color
    vec3 rgb = mix(vec3(1, 1, 1), mix(vec3(1, 1, 1), closestPointCol.rgb, 0.5), 0.5000);
    
    // Final Sparkle Color: (Cross + Bloom) * RGB color * Intensity (10.)
    // Note: This results in high, unclipped values for a bright sparkle effect.
    return vec4(rgb * (cross + bloom) * 10., 
                (cross.r + bloom.r) * 10. * rgb.r); // Alpha calculation based on intensity
}

void main() {
    // Generate the glitter layer
    vec4 stars = getStarLayer(vTextureCoord, 1.0, vec2(0.0));
    
    // Sample the base color
    vec4 color = texture(uTexture, vTextureCoord);
    
    // Blend the glitter (additive blend for the RGB channels)
    color.rgb += stars.rgb;
    
    // Max alpha
    color.a = max(color.a, stars.a);
    
    fragColor = color;
}
```

## File: extracted/misc/gradientFill
```
// This shader generates a procedural Linear Gradient Fill, offering features like color stop definition, animation, rotation, and high-quality color blending in the OKLab color space.

// 1. Vertex Shader (Shared)
// OpenGL Shading Language

#version 300 es
precision mediump float;

// Attributes
in vec3 aVertexPosition;
in vec2 aTextureCoord;

// Uniforms
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;

// Outputs
out vec2 vTextureCoord;
out vec3 vVertexPosition;

void main() {
    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
    vTextureCoord = aTextureCoord;
}

// 2. Fragment Shader (Gradient Generation)
// This pass defines the gradient color stops, handles the color space conversions for accurate mixing, calculates the gradient position, and applies rotation/animation.

// OpenGL Shading Language

#version 300 es
precision highp float;

// Inputs
in vec2 vTextureCoord;

// Uniforms
uniform sampler2D uTexture;
uniform float uTime;
uniform vec2 uMousePos;
uniform vec2 uResolution;

// Output
out vec4 fragColor;

// --- Constants ---
const float PI = 3.14159265359;

// --- Gradient Color Stop Definitions (16 possible stops defined) ---
// Note: Only stops 0 and 1 are active in the supplied code (Black to White)

vec3 getColor(int index) {
    switch(index) {
        case 0: return vec3(0, 0, 0); // Black
        case 1: return vec3(1, 1, 1); // White
        // ... (remaining cases are black) ...
        default: return vec3(0.0);
    }
}

float getStop(int index) {
    switch(index) {
        case 0: return 0.0000;
        case 1: return 1.0000;
        // ... (remaining cases are 0.0) ...
        default: return 0.0;
    }
}

// --- Utility Functions ---

// Simple addition blend (used for compositing)
vec3 blend (int blendMode, vec3 src, vec3 dst) {
    return src + dst;
}

// 2D Rotation
vec2 rotate(vec2 coord, float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return vec2(
        coord.x * c - coord.y * s,
        coord.x * s + coord.y * c
    );
}

// Simple XOR hash for random dither noise
float rand(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

// --- Color Space Conversions (sRGB <-> Linear) ---

vec3 linear_from_srgb(vec3 rgb) {
    return pow(rgb, vec3(2.2));
}

vec3 srgb_from_linear(vec3 lin) {
    return pow(lin, vec3(1.0/2.2));
}

// --- OKLab Color Mixing (for perceptual uniform blending) ---
// Mixes two colors in linear space after converting to OKLab's perceptually uniform space.

vec3 oklab_mix(vec3 lin1, vec3 lin2, float a) {
    // Conversion matrices truncated for brevity
    const mat3 kCONEtoLMS = mat3(
        0.4121656120, 0.2118591070, 0.0883097947,
        0.5362752080, 0.6807189584, 0.2818474174,
        0.0514575653, 0.1074065790, 0.6302613616);
    const mat3 kLMStoCONE = mat3(
        4.0767245293, -1.2681437731, -0.0041119885,
        -3.3072168827, 2.6093323231, -0.7034763098,
        0.2307590544, -0.3411344290, 1.7068625689);
        
    // Convert linear RGB to LMS space and apply cube root (OKLab space preparation)
    vec3 lms1 = pow( kCONEtoLMS * lin1, vec3(1.0/3.0) );
    vec3 lms2 = pow( kCONEtoLMS * lin2, vec3(1.0/3.0) );
    
    // Mix in LMS space
    vec3 lms = mix( lms1, lms2, a );
    
    // Apply contrast compensation (lms *= 1.0 + epsilon)
    lms *= 1.0 + 0.025 * a * (1.0 - a);
    
    // Convert back to linear RGB space
    return kLMStoCONE * (lms * lms * lms);
}

// --- Gradient Core Logic ---

// Get the final color for a normalized position (0.0 to 1.0)
vec3 getGradientColor(float position) {
    position = clamp(position, 0.0, 1.0);
    
    // Loop through all *active* stops (from 0 up to 2 - 1 = 1)
    for (int i = 0; i < 2 - 1; i++) { 
        float colorPosition = getStop(i);
        float nextColorPosition = getStop(i + 1);
        
        if (position <= nextColorPosition) {
            float mixFactor = (position - colorPosition) / (nextColorPosition - colorPosition);
            
            // Get colors in linear space
            vec3 linStart = linear_from_srgb(getColor(i));
            vec3 linEnd = linear_from_srgb(getColor(i + 1));
            
            // Mix using the OKLab-based function
            vec3 mixedLin = oklab_mix(linStart, linEnd, mixFactor);
            
            // Convert back to sRGB for display
            return srgb_from_linear(mixedLin);
        }
    }
    // If the loop finishes, return the color of the last defined stop (index 1)
    return getColor(2 - 1); 
}

// Applies animation, cycling, and dither to the normalized position
vec3 applyColorToPosition(float position) {
    vec3 color = vec3(0);
    
    // Time-based shift (uTime * 0.01 + 0.0000)
    position -= (uTime * 0.01 + 0.0000);
    
    // Cycle determines which repetition of the gradient we are in
    float cycle = floor(position);
    
    // Reverse flag (0.0000 > 0.5 is false, so reverse is disabled)
    bool reverse = 1.0000 > 0.5 && int(cycle) % 2 == 0;
    
    // Normalized position within the current cycle [0, 1]
    float animatedPos = reverse ? 1.0 - fract(position) : fract(position);
    
    color = getGradientColor(animatedPos);
    
    // Add dither noise
    float dither = rand(gl_FragCoord.xy) * 0.005;
    color += dither;
    
    return color;
}

// Linear Gradient: Maps UV x-coordinate to the color position
vec3 linearGrad(vec2 uv) {
    // Gradient runs horizontally from x=-0.5 to x=0.5
    float position = (uv.x + 0.5); 
    return applyColorToPosition(position);
}

vec3 getGradient(vec2 uv) {
    return linearGrad(uv);
}

vec3 getColor(vec2 uv) {
    // Switch selects the gradient (default case)
    switch(2) { 
        case 1: return vec3(0, 0, 0); break;
        default: return getGradient(uv); break;
    }
}

// --- Main Function ---

void main() {
    vec2 uv = vTextureCoord;
    vec2 res = uResolution;
    
    // Center point (Mouse control disabled)
    vec2 pos = vec2(0.5, 0.5) + mix(vec2(0), (uMousePos - 0.5), 0.0000);
    
    // 1. Center UV (0.5 to 0.5)
    uv -= pos;
    
    // 2. Scale UV (zoom out/increase gradient coverage)
    uv /= (0.5000 * 2.);
    
    // 3. Rotate UV (Rotation is disabled with 0.0000)
    uv = rotate(uv, (0.0000 - 0.5) * 2. * PI);
    
    // Get the final gradient color
    vec4 color = vec4(getColor(uv), 1);
    vec4 bg = texture(uTexture, vTextureCoord);
    
    // Composite
    color.rgb = blend(1, bg.rgb, color.rgb); // Additive blend (bg + color)
    color.rgb = mix(bg.rgb, color.rgb, 1.0000); // 100% application of the blended result
    
    fragColor = color;
}
```

## File: extracted/misc/noiseFill
```
// This shader generates a complex, colorful Noise Fill pattern, likely intended for use as a procedural texture or background effect. It uses a high-quality 3D noise function (a derivative-enabled Body-Centered Cubic (BCC) Noise) and maps the resulting noise value to a custom, aesthetically pleasing color palette.

// 1. Vertex Shader (Shared)
// OpenGL Shading Language

#version 300 es
precision mediump float;

// Attributes
in vec3 aVertexPosition;
in vec2 aTextureCoord;

// Uniforms
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat4 uTextureMatrix;

// Outputs
out vec2 vTextureCoord;
out vec3 vVertexPosition;

void main() {
    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
    vTextureCoord = (uTextureMatrix * vec4(aTextureCoord, 0.0, 1.0)).xy;
}

// 2. Fragment Shader (BCC Noise Generation and Color Mapping)
// This pass focuses on generating the procedural texture. The bulk of the code implements the BCC noise algorithm and a custom color palette function.

// OpenGL Shading Language

#version 300 es
precision highp float;

// Inputs
in vec2 vTextureCoord;
in vec3 vVertexPosition;

// Uniforms
uniform sampler2D uTexture;
uniform float uTime;
uniform vec2 uMousePos;
uniform vec2 uResolution;

// Output
out vec4 fragColor;

const float PI = 3.14159265359;
const float TAU = 6.28318530718;

// --- Utility Functions ---

// 2D Rotation Matrix
mat2 rot(float a) {
    return mat2(cos(a), -sin(a), sin(a), cos(a));
}

// PCG 2D Hash (Pseudorandom number generator for dither)
uvec2 pcg2d(uvec2 v) {
    v = v * 1664525u + 1013904223u;
    v.x += v.y * v.y * 1664525u + 1013904223u;
    v.y += v.x * v.x * 1664525u + 1013904223u;
    v ^= v >> 16;
    v.x += v.y * v.y * 1664525u + 1013904223u;
    v.y += v.x * v.x * 1664525u + 1013904223u;
    return v;
}

// Float random number generator using the PCG hash
float randFibo(vec2 p) {
    uvec2 v = floatBitsToUint(p);
    v = pcg2d(v);
    uint r = v.x ^ v.y;
    return float(r) / float(0xffffffffu);
}

// --- Color Palette Function (Customized Gradient) ---

// Anchored Palette: Generates a color based on a cycling T value, anchored between two key colors.
vec3 anchoredPal(float t, vec3 col1, vec3 col2) {
    vec3 mid = 0.5 * (col1 + col2);
    vec3 axisAmp = 0.5 * (col2 - col1);
    
    // Base color is a smooth sinusoidal blend between col1 and col2
    vec3 base = mid + axisAmp * cos(TAU * t);
    
    // Calculate ripple effect (color richness/deviation from the base gradient)
    vec3 axis = length(axisAmp) > 0.0001 ? normalize(axisAmp) : vec3(1.0, 0.0, 0.0);
    vec3 ref = abs(axis.x) > 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    vec3 tangent1 = normalize(cross(axis, ref));
    vec3 tangent2 = normalize(cross(axis, tangent1));

    float richness = 0.24 * length(axisAmp) + 0.02;
    vec3 ripple = tangent1 * sin(TAU * (t * 2.0 + 0.123)) + tangent2 * sin(TAU * (t * 3.0 + 0.437));
    
    // Final color with added ripple
    vec3 col = base + (richness * 0.5000) * ripple;
    
    // Sigmoid function for contrast and saturation
    col = 1. / (1. + exp(-col * 4. + 0.25) * 7.5);
    return col;
}

// --- BCC Noise Functions (Body-Centered Cubic Noise) ---
// This section implements a high-quality 3D noise function with derivatives.

vec4 permute(vec4 t) {
    return t * (t * 34.0 + 133.0);
}

// Gradient vector lookup (based on hash index)
vec3 grad(float hash) {
    // ... [Complex logic for generating gradient vectors] ...
    vec3 cube = mod(floor(hash / vec3(1.0, 2.0, 4.0)), 2.0) * 2.0 - 1.0;
    vec3 cuboct = cube;
    float index0 = step(0.0, 1.0 - floor(hash / 16.0));
    float index1 = step(0.0, floor(hash / 16.0) - 1.0);
    cuboct.x *= 1.0 - index0;
    cuboct.y *= 1.0 - index1;
    cuboct.z *= 1.0 - (1.0 - index0 - index1);
    float type = mod(floor(hash / 8.0), 2.0);
    vec3 rhomb = (1.0 - type) * cube + type * (cuboct + cross(cube, cuboct));
    vec3 grad = cuboct * 1.22474487139 + rhomb;
    grad *= (1.0 - 0.042942436724648037 * type) * 3.5946317686139184;
    return grad;
}

// BCC noise calculation (main part, returns derivative and value)
vec4 bccNoiseDerivativesPart(vec3 X) {
    // ... [Detailed implementation of BCC noise calculation] ...
    // Returns vec4(derivative.x, derivative.y, derivative.z, noise_value)
    
    vec3 b = floor(X);
    vec4 i4 = vec4(X - b, 2.5);
    // ... (truncated for brevity)
    vec4 extrapolations = vec4(dot(d1, g1), dot(d2, g2), dot(d3, g3), dot(d4, g4));
    vec3 derivative = -8.0 * mat4x3(d1, d2, d3, d4) * (aa * a * extrapolations) + mat4x3(g1, g2, g3, g4) * aaaa;
    return vec4(derivative, dot(aaaa, extrapolations));
}

// Applies rotation/projection to 3D space and combines two BCC lattices
vec4 bccNoiseDerivatives_XYBeforeZ(vec3 X) {
    mat3 orthonormalMap = mat3(
        0.788675134594813, -0.211324865405187, -0.577350269189626,
        -0.211324865405187, 0.788675134594813, -0.577350269189626,
        0.577350269189626, 0.577350269189626, 0.577350269189626);
        
    // Transform input to orthonormal space
    X = orthonormalMap * X;
    
    // Combine two staggered lattices (bccNoiseDerivativesPart(X) and bccNoiseDerivativesPart(X + 144.5))
    vec4 result = bccNoiseDerivativesPart(X) + bccNoiseDerivativesPart(X + 144.5);
    
    // Transform derivatives back and return
    return vec4(result.xyz * orthonormalMap, result.w);
}

// 2D Noise wrapper that calls the 3D BCC noise
float get2sNoise(vec2 uv) {
    float turb = 0.6200 * 2.; // High turbulence/scaling factor
    
    // X drift is 0, Y drift is 0.0000 (disabled time drift)
    vec2 drift = vec2(0, 0.0000 * uTime * 0.008) * mix(1., 14., 0.7300); 
    
    // Input coordinates for 3D noise: (X, Y, Z=Time)
    // uv * vec2(0.47, 1 - 0.47) * 0.7 - drift creates custom scaling/stretching on X/Y
    vec4 noise = bccNoiseDerivatives_XYBeforeZ(vec3(uv * vec2(0.4700, 1. - 0.4700) * 0.7 - drift, 0.0000 + uTime * 0.02));
    
    // Mix the noise value (noise.w) with 0.5 based on the turbulence factor
    return mix(0.5, noise.w * 0.5 + 0.5, turb);
}

float getNoise(vec2 uv) {
    return get2sNoise(uv);
}

// --- Main Function ---

void main() {
    vec2 uv = vTextureCoord;
    float aspectRatio = uResolution.x / uResolution.y;
    vec2 aspect = vec2(aspectRatio, 1.0);
    
    // Center point (Mouse control disabled)
    vec2 mPos = vec2(0.5, 0.5) + mix(vec2(0), (uMousePos - 0.5), 0.0000);
    vec2 pos = mix(vec2(0.5, 0.5), mPos, 0.0000);
    
    // Scale factor
    float scale = mix(1., 14., 0.7300);
    
    // Time drift (disabled)
    vec2 drift = vec2(0, 0.0000 * uTime * 0.0125);
    
    // Rotation (disabled)
    mat2 rotation = rot(0.0000 * 2. * PI);
    
    // Transform UV coordinates: center, aspect correct, scale, and rotate
    vec2 st = (uv - pos) * aspect * scale * rotation;
    
    float noise = getNoise(st);
    
    // --- Mouse/Bulge Distortion (Disabled: 0.0000 > 0.0 is false) ---
    if (0.0000 > 0.0) {
        // ... (Distortion logic is skipped) ...
        st = (uv - pos + offset * noise) * aspect * scale * rotation;
        noise = getNoise(st);
    }
    
    vec4 color = texture(uTexture, uv);
    vec4 bg = color; // Original color
    
    // --- Color Mapping ---
    
    float shift = 0.0000 + (0.0000 * uTime * 0.01); // Time shift (disabled)
    
    // Map the noise value to the custom palette
    vec3 noiseColor = anchoredPal(
        noise + shift, 
        vec3(1, 0.8196078431372549, 0.596078431372549), // Key Color 1 (Yellow-Orange)
        vec3(0.5882352941176471, 0, 0.9019607843137255)  // Key Color 2 (Magenta/Purple)
    );
    
    color.rgb = noiseColor.rgb;
    
    // --- Dithering ---
    
    // Simple dither noise (to break up banding)
    float dither = (randFibo(gl_FragCoord.xy) - 0.5) / 255.0;
    color.rgb += dither * 0.5;
    
    // --- Final Composite ---
    
    // Mix the background color (bg.rgb) with the generated noise color (100% replacement)
    color.rgb = mix(bg.rgb, color.rgb, 1.0000);
    color.a = max(bg.a, 1.0000); // Preserve alpha or set to 1.0
    
    fragColor = color;
}
```

## File: extracted/misc/pattern
```
// This shader is designed to apply one of several procedural geometric patterns onto a base texture using Signed Distance Functions (SDFs). It supports various tileable patterns like grids, stripes, circles, and hexagons.

// 1. Vertex Shader (Shared)
// OpenGL Shading Language

#version 300 es
precision mediump float;

// Attributes
in vec3 aVertexPosition;
in vec2 aTextureCoord;

// Uniforms
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;

// Outputs
out vec2 vTextureCoord;
out vec3 vVertexPosition;

void main() {
    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
    vTextureCoord = aTextureCoord;
}

// 2. Fragment Shader (Pattern Generation via SDFs)
// This pass defines multiple SDFs to create the patterns, selects one, and uses it to mask and blend a color over the base texture.

// OpenGL Shading Language

#version 300 es
precision mediump float;

// Inputs
in vec3 vVertexPosition;
in vec2 vTextureCoord;

// Uniforms
uniform sampler2D uTexture;
uniform float uTime;
uniform vec2 uResolution;

// Output
out vec4 fragColor;

// --- Utility Functions ---

mat2 rotate2d(float _angle){
    return mat2(cos(_angle),-sin(_angle),
                sin(_angle),cos(_angle));
}

// --- Signed Distance Functions (SDFs) ---
// Note: SDFs return the shortest distance from the current point 'st' to the shape's boundary.
// Negative values are inside, positive are outside.

// Grid Pattern SDF (Distance to the closest cell edge)
float gridSDF(vec2 st, float tile) {
    vec2 grid = fract(st);
    vec2 distToEdge = min(grid, 1.0 - grid); // Distance to cell boundaries [0, 1]
    float minDist = min(distToEdge.x, distToEdge.y);
    return minDist - tile * 0.5;
}

// Stripe Pattern SDF (Distance to the closest vertical line)
float stripeSDF(vec2 st, float tile) {
    float x = fract(st.x - uTime * 0.05); // Animated horizontal position
    return abs(x - 0.5) - tile * 0.5;
}

// Arrows Pattern SDF
float arrowsSDF(vec2 st, float tile) {
    vec2 grid = floor(st);
    vec2 cell = fract(st);
    float checker = mod(grid.x + grid.y, 2.0);
    // Alternate between using X and Y distance based on checkerboard pattern
    float arrow = checker > 0.5 ? cell.x : cell.y;
    return abs(arrow - 0.5) - tile * 0.5;
}

// Concentric Circle Pattern SDF
float concentricCircleSDF(vec2 st, float tile) {
    float r = length(st); // Distance from the center (0, 0)
    return abs(fract(r) - 0.5) - tile * 0.5; // Distance to the closest periodic radius
}

// Circle Array SDF (Distance to the center of the current cell)
float circleSDF(vec2 st, float tile) {
    vec2 cell = fract(st) - 0.5; // Center of current cell is (0, 0)
    float dist = length(cell);
    return dist - tile * 0.5;
}

// Checkerboard SDF (Binary function, not a true distance field)
float checkerboardSDF(vec2 st, float tile) {
    vec2 grid = floor(st);
    float checker = mod(grid.x + grid.y, 2.0);
    return checker > 0.5 ? -1.0 : 1.0; // Returns -1 (inside) or 1 (outside)
}

// Wavy Lines SDF (Horizontal lines modulated by a sine wave)
float wavyLinesSDF(vec2 st, float tile) {
    float wave = sin(st.x * 6.28318 + st.y * 10.0) * 0.5 + 0.5;
    return abs(wave - 0.5) - tile * 0.5;
}

// Hexagonal Grid SDF (Approximation)
float hexagonalSDF(vec2 st, float tile) {
    const float sqrt3 = 1.732050808;
    st = abs(st);
    // Project onto one axis of the hexagon
    float d = dot(st, normalize(vec2(1.0, sqrt3))); 
    return max(d, st.x) - tile; // Max operation defines the corners/edges
}

// Diamond Array SDF
float diamondSDF(vec2 st, float tile) {
    vec2 cell = fract(st) - 0.5;
    float d = abs(cell.x) + abs(cell.y); // Manhattan distance from cell center
    return d - tile * 0.5;
}

// Spiral Pattern SDF
float spiralSDF(vec2 st, float tile) {
    float r = length(st);
    float theta = atan(st.y, st.x);
    // Creates a spiral by mapping angular and radial distance to a periodic function
    float spiral = fract((theta + r * 5.0) / 6.28318);
    return abs(spiral - 0.5) - tile * 0.5;
}

// --- Pattern Selector ---

float getPatternSDF(vec2 st, float tile) {
    st.y -= uTime * 0.05; // Global vertical scroll
    
    // Selects the pattern using the switch statement
    switch(0) { // Currently selecting case 0: gridSDF
        case 0: return gridSDF(st, tile);
        case 1: return stripeSDF(st, tile);
        case 2: return circleSDF(st, tile);
        case 3: return concentricCircleSDF(st, tile);
        case 4: return arrowsSDF(st, tile);
        case 5: return checkerboardSDF(st, tile);
        case 6: return wavyLinesSDF(st, tile);
        case 7: return hexagonalSDF(st, tile);
        case 8: return diamondSDF(st, tile);
        case 9: return spiralSDF(st, tile);
        default: return gridSDF(st, tile);
    }
}

// --- Main Function ---

void main() {
    vec2 uv = vTextureCoord;
    vec4 bg = texture(uTexture, uv);
    
    // Skip if input is transparent
    if(bg.a == 0.) {
        fragColor = vec4(0);
        return;
    }
    
    // Color of the pattern (Magenta/Purple)
    vec4 color = vec4(vec3(0.98, 0.12, 0.89), 1.);
    
    // --- Scale and Tile Calculation ---
    
    float aspectRatio = uResolution.x / uResolution.y;
    float res = max(uResolution.x, uResolution.y);
    float px = (1. / res); // Normalized pixel size (based on max resolution)
    float py = px / aspectRatio;
    float scl = (40. * 0.5000); // Scale factor (20.0)
    float minpx = min(px, py);
    
    // Tile size calculation (normalized)
    float tile = (minpx + 0.1000 / scl) * scl;
    tile = round(tile / minpx) * minpx;
    
    // --- Coordinate Transformation ---
    
    // 1. Center UV
    vec2 st = (uv - vec2(0.5, 0.5)) * scl;
    // 2. Aspect correction
    st *= vec2(aspectRatio, 1);
    // 3. Rotation (Disabled: 0.0000)
    st = st * rotate2d(0.0000 * 360. * 3.1415926 / 180.); 
    
    // --- Pattern Generation ---
    
    float sdf = getPatternSDF(st, tile);
    
    // Define the radius for smoothing (based on pixel size and scale)
    float smoothRadius = minpx * scl;
    
    // Generate the pattern mask using smoothstep (0.0=outside, 1.0=inside)
    // -sdf because we want the inside (negative SDF) to be 1.0
    float pattern = 1.0 - smoothstep(-smoothRadius, smoothRadius, sdf);
    
    // Apply the pattern mask to the color
    color.rgb *= pattern;
    color.a *= pattern; // Also affect alpha
    
    // --- Final Blend ---
    
    // Mix the background (bg) with the patterned color (color)
    fragColor = mix(bg, color, color.a * 1.0000);
}
```

## File: extracted/misc/replicate
```
// This shader creates a Replicate / Trail / Aberration effect by repeatedly sampling the source texture along a defined offset direction (currently vertical, as rotation is disabled). The samples are composited using their alpha value, resulting in a layered, ghosting, or smear effect.

// 1. Vertex Shader (Shared)
// OpenGL Shading Language

#version 300 es
precision mediump float;

// Attributes
in vec3 aVertexPosition;
in vec2 aTextureCoord;

// Uniforms
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat4 uTextureMatrix;

// Outputs
out vec2 vTextureCoord;
out vec3 vVertexPosition;

void main() {
    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
    vTextureCoord = (uTextureMatrix * vec4(aTextureCoord, 0.0, 1.0)).xy;
}
// 2. Fragment Shader (Replicate and Composite)
// This pass loops a fixed number of times, calculating a progressively increasing UV offset for each repetition and blending the resulting texture sample into the final color.

// OpenGL Shading Language

#version 300 es
precision highp float;

// Inputs
in vec2 vTextureCoord;

// Uniforms
uniform sampler2D uTexture;
uniform float uTime;
uniform vec2 uResolution;

// Output
out vec4 fragColor;

void main() {
    vec2 uv = vTextureCoord;
    
    // --- Setup Parameters ---
    
    // Rotation angle (Disabled: 0.0000 * 2 * PI = 0)
    float rotation = (0.0000 * 2. * 3.141592653); 
    
    float aspectRatio = uResolution.x / uResolution.y;
    
    // Spacing between replicated copies
    float repeatSpacing = 1.0000 * 0.35 * mix(1., aspectRatio, 0.5);
    
    // Time component controls the scrolling animation speed
    float time = (uTime * 0.025 + 0.0000) / (repeatSpacing + 0.001);
    
    vec2 aberrated = vec2(0);
    vec4 col = vec4(0);
    
    // --- Replication Loop ---
    
    const int MAX_REPEATS = 100;

    // Loop through the replicas (limited to 16.0000 copies)
    for (int i = 0; i < MAX_REPEATS; ++i) {
        if (float(i) >= 16.0000) break;
        
        float fi = float(i);
        
        // Offset Calculation: 
        // 1. fi: Base offset based on copy index (0, 1, 2, ...)
        // 2. - 0.5 * 16.0000: Centers the trail around the origin (16 copies -> center is 8)
        // 3. + fract(time): Smooth, looping time-based animation/shift
        float offset = repeatSpacing * (fi - 0.5 * 16.0000 + fract(time));
        
        // Apply rotation (if rotation was non-zero, this would determine the direction of the trail)
        aberrated = vec2(offset * sin(rotation), offset * cos(rotation));
        
        // --- Alpha Compositing (Additive blending) ---
        
        // Sample the texture at the offset UV coordinate
        // Add the sampled color (texture(uTexture, uv + aberrated))
        // Weighted by the remaining alpha of the current accumulated color (1.0 - col.a)
        // This simulates over-compositing with alpha.
        col += texture(uTexture, uv + aberrated) * (1.0 - col.a);
    }
    
    fragColor = col;
}
```

## File: extracted/misc/wisps
```
// This shader generates a dynamic "Wisps" or "Flowing Smoke" effect using an Additive Voronoi Noise technique. The effect creates glowing, shimmering trails that move across the screen.

// 1. Vertex Shader (Shared)
// OpenGL Shading Language

#version 300 es
precision mediump float;

// Attributes
in vec3 aVertexPosition;
in vec2 aTextureCoord;

// Uniforms
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat4 uTextureMatrix;

// Outputs
out vec2 vTextureCoord;
out vec3 vVertexPosition;

void main() {
    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
    vTextureCoord = (uTextureMatrix * vec4(aTextureCoord, 0.0, 1.0)).xy;
}

// 2. Fragment Shader (Additive Voronoi Wisps)
// This pass generates two layers of additive Voronoi noise that drift over time, which are then blended additively onto the base texture.

// OpenGL Shading Language

#version 300 es
precision highp float;

// Inputs
in vec3 vVertexPosition;
in vec2 vTextureCoord;

// Uniforms
uniform sampler2D uTexture;
uniform float uTime;
uniform vec2 uMousePos;
uniform vec2 uResolution;

// Output
out vec4 fragColor;

const float PI = 3.14159265359;

// --- Utility Functions ---

// Additive blend (used for compositing)
vec3 blend (int blendMode, vec3 src, vec3 dst) {
    return src + dst;
}

// 2D Rotation Matrix
mat2 rot(float a) {
    return mat2(cos(a), -sin(a), sin(a), cos(a));
}

// Simple hash function (returns vector in [-1, 1] range)
vec2 hash(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

// Luma (luminance) calculation
float luma(vec3 color) {
    return dot(color, vec3(0.299, 0.587, 0.114));
}

// --- Additive Voronoi Noise Function ---
// Calculates the sum of contributions from nearby cell centers.
float voronoi_additive(vec2 st, float radius, vec2 mouse_pos, float scale) {
    vec2 i_st = floor(st); // Cell index
    vec2 f_st = fract(st); // Position within cell [0, 1]
    
    float wander = 0.0000 * uTime * 0.2; // Cell movement (disabled)
    float total_contribution = 0.0;
    
    // Iterate over surrounding 5x5 cells
    for (int y = -2; y <= 2; y++) {
        for (int x = -2; x <= 2; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 cell_id = i_st + neighbor;
            
            // 1. Calculate cell center position ('point')
            vec2 point = hash(cell_id);
            // Move cell center sinusoidally over time (creating the shimmer/flow)
            point = 0.5 + 0.5 * sin(5. + wander + 6.2831 * point); 
            
            // 2. Apply Mouse Attraction (Disabled)
            vec2 starAbsPos = cell_id + point;
            vec2 dirToMouse = mouse_pos - starAbsPos;
            float distToMouse = length(dirToMouse);
            float attractStrength = 0.0000 * exp(-distToMouse * mix(2.0 + 0.5000 * 2., 0.5, 0.5000)) * 2.;
            starAbsPos += dirToMouse * attractStrength;
            
            // 3. Calculate distance to the cell center
            vec2 diff = starAbsPos - st;
            float dist = length(diff);
            
            // 4. Calculate Contribution (Inverse distance function: 1/dist)
            float contribution = radius / max(dist, radius * 0.1); 
            
            // 5. Apply Shimmer/Flicker effect
            float shimmer_phase = dot(point, vec2(1.0)) * 10. + hash(cell_id).x * 5.0 + uTime * 0.5;
            float shimmer = mix(1., (sin(shimmer_phase) + 1.), 0.5000);
            contribution *= shimmer;
            
            // 6. Final Contribution Mix (mix between contribution^2 and contribution*2)
            total_contribution += mix(contribution * contribution, contribution * 2., 0.2500);
        }
    }
    return total_contribution;
}

// --- Main Wisps Generation ---

vec4 randomStyle() {
    vec2 uv = vTextureCoord;
    vec4 bg = texture(uTexture, uv);
    vec4 color = vec4(0.0);
    vec2 aspectRatio = vec2(uResolution.x / uResolution.y, 1.0);
    
    // 1. Transform UV coordinates
    vec2 mPos = mix(vec2(0.0), (uMousePos - 0.5), 0.0000); // Mouse offset disabled
    
    uv -= vec2(0.5, 0.5);
    uv *= aspectRatio;
    uv = uv * rot(0.0000 * 2.0 * PI); // Rotation disabled
    uv *= 40.0 * 0.5000;              // Scale factor (20.0)
    uv *= mix(vec2(1.0), vec2(1.0, 0.0), 0.0000); // X-squash disabled
    uv /= aspectRatio;
    
    // 2. Prepare coordinates for two layers
    
    // Y-axis drift for flowing motion
    vec2 movementOffset = vec2(0.0, uTime * 0.5000 * -0.05);
    
    vec2 st1 = uv - (mPos * 38.0 * 0.5000);
    vec2 st2 = uv - (mPos * 48.0 * 0.5000);
    
    // Add movement to UV coordinates
    vec2 mouse1 = st1 + movementOffset;
    vec2 mouse2 = st2 + vec2(0.0, uTime * 0.5000 * -0.05);
    
    float radius1 = 0.5 * 0.5000;
    float radius2 = 0.5 * 0.5000;
    
    // 3. Generate two Voronoi layers
    // Note: The second layer is offset by vec2(10) to use a different set of Voronoi cells.
    float pass1 = voronoi_additive(mouse1 * aspectRatio, radius1, mouseGrid1 * aspectRatio, 38.0 * 0.5000);
    float pass2 = voronoi_additive(mouse2 * aspectRatio + vec2(10), radius2, mouseGrid2 * aspectRatio + vec2(10.0), 48.0 * 0.5000);
    
    // 4. Scale contribution and apply color
    pass1 *= 0.02; // Layer 1 (fine-tuning)
    pass2 *= 0.04; // Layer 2 (fine-tuning)
    
    // Combine layers, colorize (white), and optionally darken by background Luma (disabled)
    color.rgb = (pass1 + pass2) * vec3(1, 1, 1) * mix(1.0, bg.r, 0.0000);
    color.rgb = clamp(color.rgb, 0.0, 1.0);
    
    // 5. Composite
    color.rgb = blend(1, bg.rgb, color.rgb); // Additive blend (bg.rgb + color.rgb)
    
    // Set alpha based on the maximum of background alpha and the wisp's luma (intensity)
    color = vec4(color.rgb, max(bg.a, luma(color.rgb)));
    
    return color;
}

void main() {
    vec4 color;
    color = randomStyle();
    fragColor = color;
}
```

## File: extracted/stylize/chromaticAbberation
```
// This shader implements a Chromatic Aberration (CA) effect, which simulates the optical defect where a lens fails to focus all colors to the same point. In this implementation, the red and blue channels are offset along a specific radial direction, creating a colored fringe.

// 1. Vertex Shader (Shared)
// OpenGL Shading Language

#version 300 es
precision mediump float;

// Attributes
in vec3 aVertexPosition;
in vec2 aTextureCoord;

// Uniforms
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat4 uTextureMatrix;

// Outputs
out vec2 vTextureCoord;
out vec3 vVertexPosition;

void main() {
    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
    vTextureCoord = (uTextureMatrix * vec4(aTextureCoord, 0.0, 1.0)).xy;
}
// 2. Fragment Shader (Chromatic Aberration)
// This pass calculates the direction and magnitude of the color separation and samples the texture three times to construct the final fringed color.

// OpenGL Shading Language

#version 300 es
precision highp float;

// Inputs
in vec3 vVertexPosition;
in vec2 vTextureCoord;

// Uniforms
uniform sampler2D uTexture;
uniform float uTime;
uniform vec2 uMousePos;
uniform vec2 uResolution;

// Output
out vec4 fragColor;

const float PI = 3.1415926;

// Easing function (disabled in this implementation)
float ease (int easingFunc, float t) {
    return t;
}

// Composites the R, G, B channels from the three shifted samples
vec3 getAbberatedColor(vec3 color, vec3 left, vec3 center, vec3 right) {
    // Red Channel (R): taken from the 'left' (negative offset) sample
    // Green Channel (G): taken from the original color, but mixed 0% with center sample (effectively just original color.g)
    // Blue Channel (B): taken from the 'right' (positive offset) sample
    return vec3(left.r, mix(color.g, center.g, float(0)), right.b);
}

void main() {
    vec2 uv = vTextureCoord;
    float aspectRatio = uResolution.x / uResolution.y;
    
    // Light Position / Center of Aberration (Mouse control disabled with 0.0000)
    vec2 mPos = vec2(0.5, 0.5) + mix(vec2(0), (uMousePos - 0.5), 0.0000);
    vec2 pos = vec2(0.5, 0.5); // Fixed center
    
    // Rotation Angle (Animated based on uTime, but rotation amount is scaled by 0.0000, so mostly fixed)
    float angle = ((0.0000 + uTime * 0.05) * 360.0) * PI / 180.0;
    vec2 rotation = vec2(sin(angle), cos(angle));
    
    vec4 color = texture(uTexture, uv);
    
    // Mouse Distance Mask (Disabled due to 1.0000 factor in the (1. - 1.0000) part)
    float mDist = ease(0, max(0., 1. - distance(uv * vec2(aspectRatio, 1.), mPos * vec2(aspectRatio, 1.)) * 4. * (1. - 1.0000)));
    mDist = 1.0; // Assuming this evaluates to 1.0 or is intended to be full screen
    
    vec2 aberrated;
    
    // Aberration Vector Calculation:
    // Scale: 0.2000 * 0.03 = 0.006 (strength)
    // Direction: `rotation` vector (fixed direction if uTime is disabled)
    // Falloff: `distance(uv, pos)` (radial distance from center, disabled by 0.0000 mix factor)
    aberrated = 0.2000 * rotation * 0.03 * mix(1.0, distance(uv, pos) * (1.0 + 0.0000), 0.0000);
    
    // Apply mouse mask (mDist is likely 1.0)
    aberrated *= mDist; 
    
    float amt = length(aberrated);
    
    // Early Exit if aberration amount is negligible
    if(amt < 0.001) {
        fragColor = color;
        return;
    }
    
    // --- Sample Shifting ---
    
    // 1. Left Sample (Red channel): Offset backward
    vec4 left = texture(uTexture, uv - aberrated);
    
    // 2. Right Sample (Blue channel): Offset forward
    vec4 right = texture(uTexture, uv + aberrated);
    
    // 3. Center Sample (Green channel): Not used for color, but needed for alpha
    vec4 center = vec4(0); // If center is vec4(0), the green channel will fall back to `color.g` in getAbberatedColor
    
    // --- Final Composite ---
    
    color.rgb = getAbberatedColor(color.rgb, left.rgb, center.rgb, right.rgb);
    
    // Max alpha from all three samples to prevent edges from becoming transparent
    color.a = max(max(left.a, center.a), right.a);
    
    fragColor = color;
}
```

## File: extracted/stylize/crt
```
// This shader implements a Retro CRT Screen effect, specifically focusing on simulating the discrete pixel structure of a low-resolution monitor, likely an aperture grille or shadow mask, with elements of screen curvature, glow, and flicker.

// 1. Vertex Shader (Shared)
// OpenGL Shading Language

#version 300 es
precision mediump float;

// Attributes
in vec3 aVertexPosition;
in vec2 aTextureCoord;

// Uniforms
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat4 uTextureMatrix;

// Outputs
out vec2 vTextureCoord;
out vec3 vVertexPosition;

void main() {
    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
    vTextureCoord = (uTextureMatrix * vec4(aTextureCoord, 0.0, 1.0)).xy;
}

// 2. Fragment Shader (CRT Simulation)
// This pass handles the discretization of the image into "cells" and then renders the internal structure of those cells (like phosphors) with blending, blurring, and flicker effects.

// OpenGL Shading Language

#version 300 es
precision highp float;
precision highp int;

// Inputs
in vec2 vTextureCoord;

// Uniforms
uniform sampler2D uTexture;
uniform float uTime;
uniform vec2 uResolution;

// Output
out vec4 fragColor;

// --- CRT Style Function ---
vec3 styleOne(vec2 curvedUV) {
    // --- Cell Geometry Setup ---
    
    // Size calculation: base size (0.028) modulated by a control factor (0.5000)
    float size = max(3.0 / 1080.0, 0.028 * (1.0 - 0.5000));
    float aspectRatio = uResolution.x / uResolution.y;
    float aspectCorrection = mix(aspectRatio, 1. / aspectRatio, 0.5);
    
    // Cell size adjusted for aspect ratio
    vec2 cellSize = vec2(size / aspectRatio, size) * aspectCorrection;
    
    // --- Staggered/Shadow Mask Pattern ---
    
    vec2 staggeredUV = curvedUV;
    // Stagger cells on alternate columns (mod(x, 2.0) > 0.5)
    if (mod(floor(curvedUV.x / cellSize.x), 2.0) > 0.5) {
        staggeredUV.y += 0.5 * cellSize.y;
    }
    
    // Quantize UV to the nearest cell corner
    vec2 cellCoords = floor(staggeredUV / cellSize) * cellSize;
    
    // Reverse the staggering offset to get the center of the cell for sampling
    vec2 unstaggerOffset = vec2(0.0);
    if (mod(floor(curvedUV.x / cellSize.x), 2.0) > 0.5) {
        unstaggerOffset.y = -0.5 * cellSize.y;
    }
    
    // Sample coordinate is the center of the cell
    vec2 sampleCoord = cellCoords + 0.5 * cellSize + unstaggerOffset;
    
    // --- Color Sampling and Blurring ---
    
    // Perform a 3x3 box blur centered around the cell for a "glow" or soft pixel effect
    vec3 blurColor = vec3(0.0);
    float blurFactor = 1.0 / 9.0;
    for (int dx = -1; dx <= 1; dx++) {
        for (int dy = -1; dy <= 1; dy++) {
            vec2 offset = vec2(float(dx), dy) * cellSize * 0.5000;
            blurColor += texture(uTexture, sampleCoord + offset).rgb * blurFactor;
        }
    }

    // --- RGB Phosphor Dot Simulation ---
    
    vec3 finalColor = vec3(0.0);
    // Position within the staggered cell (0 to 1)
    vec2 staggeredCellPos = mod(staggeredUV, cellSize) / cellSize;
    
    float segmentWidth = 0.5; // Width of the primary color zone (0.5 means R, G, B are crammed together)
    float distCoord = staggeredCellPos.x;
    
    // Calculate distance from the centers of the R, G, B subpixels (at 0.25, 0.5, 0.75 if segmentWidth was 1.0)
    float distRed = abs(distCoord - segmentWidth * 0.5);
    float distGreen = abs(distCoord - segmentWidth * 1.);
    float distBlue = abs(distCoord - segmentWidth * 1.5);
    
    // Reflect distance across 0.5 to handle wrapping
    distRed = min(distRed, 1.0 - distRed);
    distGreen = min(distGreen, 1.0 - distGreen);
    distBlue = min(distBlue, 1.0 - distBlue);
    
    // Softness (controls the falloff of the phosphor glow)
    float softness = 0.75 * segmentWidth;
    
    // Subpixel factors using smoothstep to create a gaussian-like glow
    float redFactor = smoothstep(softness, 0.0, distRed * 1.05);
    float greenFactor = smoothstep(softness, 0.0, distGreen * 1.1);
    float blueFactor = smoothstep(softness, 0.0, distBlue * 0.9);
    
    // Apply factors to the blurred color (with a 3x intensity boost, reduced by 0.5000)
    finalColor.r = redFactor * blurColor.r * (3. * 0.5000);
    finalColor.g = greenFactor * blurColor.g * (3. * 0.5000);
    finalColor.b = blueFactor * blurColor.b * (3. * 0.5000);
    
    // --- Screen Edge / Scanline Darkening ---
    
    float edgeWidth = 0.05;
    vec2 edgeDistance = abs(staggeredCellPos - 0.5);
    // Darkens the phosphor edges, simulating scanline separation
    float edgeFactor = smoothstep(0.45 - edgeWidth, 0.5, max(edgeDistance.x, edgeDistance.y));
    edgeFactor = ((1.0 - edgeFactor) + 0.2); // (1.0 - edgeFactor) is the darkening effect
    finalColor = finalColor * edgeFactor;
    
    // --- Color Depth Reduction (Banding/Quantization) ---
    
    // Quantize the final color to 16 levels per channel (floor(x * 16) / 16)
    finalColor = floor(finalColor * 16.0000) / 16.0000; 
    
    // --- Flicker ---
    
    // Time-based cosine wave flicker (1.0 + small oscillation)
    float flicker = 1.0 + 0.03 * cos(sampleCoord.x / 6e1 + uTime * 2e1);
    finalColor *= mix(1., flicker, 0.5000); // 50% strength flicker
    
    return finalColor;
}

// --- Main Composite ---

void main() {
    vec3 finalColor;
    vec4 color = texture(uTexture, vTextureCoord);

    // Alpha Clipping
    if(color.a <= 0.001) {
        fragColor = vec4(0);
        return;
    }

    // Apply the CRT effect
    finalColor = styleOne(vTextureCoord);
    
    // Get original background color (used only for alpha)
    vec4 bg = texture(uTexture, vTextureCoord); 
    
    // Composite: 100% replacement with the retro effect, preserving the original alpha
    vec4 col = mix(bg, vec4(finalColor, bg.a), 1.0000);
    fragColor = col;
}
```

## File: extracted/stylize/dither
```
// This shader implements a Dithering effect, which reduces the apparent quantization artifacts (banding) that occur when an image's color depth is reduced. It uses Blue Noise Dithering, a technique known for producing high-quality, non-repeating noise patterns.1. Vertex Shader (Shared)
// OpenGL Shading Language
#version 300 es
precision mediump float;

// Attributes
in vec3 aVertexPosition;
in vec2 aTextureCoord;

// Uniforms
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat4 uTextureMatrix;

// Outputs
out vec2 vTextureCoord;
out vec3 vVertexPosition;

void main() {
    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
    vTextureCoord = (uTextureMatrix * vec4(aTextureCoord, 0.0, 1.0)).xy;
}

// 2. Fragment Shader (Blue Noise Dithering)This pass takes the scene color (uTexture), calculates a pseudo-random blue noise value for the current pixel, and uses that noise to offset the color quantization, effectively scattering the quantization error.
// OpenGL Shading Language

#version 300 es
precision highp float;
precision highp int;

// Inputs
in vec3 vVertexPosition;
in vec2 vTextureCoord;

// Uniforms
uniform sampler2D uTexture;
uniform sampler2D uBlueNoise; // Texture containing the Blue Noise pattern
uniform float uTime;
uniform vec2 uResolution;

// Output
out vec4 fragColor;

// Constants
const int MAX_LEVEL = 4; // Not used in the final logic
const float PI2 = 6.28318530718;

// --- Utility Functions ---

// PCG 2D Hash (used for pseudorandom number generation)
uvec2 pcg2d(uvec2 v) {
    v = v * 1664525u + 1013904223u;
    v.x += v.y * v.y * 1664525u + 1013904223u;
    v.y += v.x * v.x * 1664525u + 1013904223u;
    v ^= v >> 16;
    v.x += v.y * v.y * 1664525u + 1013904223u;
    v.y += v.x * v.x * 1664525u + 1013904223u;
    return v;
}

// Float random number generator using the PCG hash
float randFibo(vec2 p) {
    uvec2 v = floatBitsToUint(p);
    v = pcg2d(v);
    uint r = v.x ^ v.y;
    return float(r) / float(0xffffffffu);
}

// Samples the Blue Noise texture
float getBlueNoise(vec2 st, float delta, float size) {
    ivec2 texSize = textureSize(uBlueNoise, 0);
    
    // Calculate UV to sample Blue Noise: 
    // - Scales by screen resolution and 'size' (downscaling factor)
    // - Applies aspect ratio correction
    vec4 blueNoise = texelFetch(uBlueNoise, 
        ivec2(fract(st * (uResolution/size) / vec2(texSize) * vec2(float(texSize.x)/float(texSize.y), 1.0)) * vec2(texSize)) % texSize, 
        0);
        
    // Transform noise value: [-0.5, 0.5] -> [0, PI2] angle -> [0, 1] range.
    // Includes a time-based rotation (delta) for animated noise.
    return mod((blueNoise.r - 0.5) * PI2 + (delta * (1.0 / PI2)), PI2) / PI2 - 0.005;
}

// --- Dithering Implementation ---

vec3 dither(vec3 color, vec2 st) {
    float delta = floor(uTime);
    
    // Pseudo-random offset vector (not used in noise sampling, but generated per time step)
    vec2 offset = vec2(randFibo(vec2(123, 16) + delta), randFibo(vec2(56, 96) + delta));
    
    float noise = 0.0;
    
    // Get Blue Noise sample (using a size factor of 2.0, effectively halving the frequency)
    noise = getBlueNoise(st, delta, 2.);
    
    // Dithering parameters
    float dither_threshold = max(0.0001, 0.5000); // 0.5000: high threshold
    float num_levels = 1.0 / dither_threshold;     // num_levels = 2.0
    
    // Quantization formula:
    // 1. Scale color up by the number of desired levels: `color * num_levels`
    // 2. Add the noise offset: `+ noise` (Noise must be in [0, 1] for this to work correctly)
    // 3. Floor to the nearest level: `floor(...)`
    // 4. Scale back down: `/ num_levels`
    return floor(color * num_levels + noise) / num_levels;
}

// --- Main Function ---

void main() {
    vec2 uv = vTextureCoord;
    float delta = floor(uTime);
    vec4 color = texture(uTexture, uv);
    
    // Clip: if the input texture has zero alpha, output black and discard
    if(color.a == 0.) {
        fragColor = vec4(0);
        return;
    }
    
    // Blend the original color with the dithered color
    // A mix factor of 0.5000 is used, resulting in (original + dithered) / 2.
    color.rgb = mix(color.rgb, dither(color.rgb, vTextureCoord), 0.5000);
    
    fragColor = color;
}
This shader applies Blue Noise Dithering to reduce the color palette to 2 steps per channel (since $1 / 0.5 = 2$) and uses a dynamic Blue Noise texture to scatter the quantization error.
```

## File: extracted/stylize/glitch
```
// This shader implements a comprehensive Data Glitch / VHS Artifact effect, combining several distortion techniques: random block offsets, time-based horizontal line tearing, sinusoidal wave distortion, and chromatic aberration.

// 1. Vertex Shader (Shared)
// OpenGL Shading Language

#version 300 es
precision mediump float;

// Attributes
in vec3 aVertexPosition;
in vec2 aTextureCoord;

// Uniforms
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat4 uTextureMatrix;

// Outputs
out vec2 vTextureCoord;
out vec3 vVertexPosition;

void main() {
    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
    vTextureCoord = (uTextureMatrix * vec4(aTextureCoord, 0.0, 1.0)).xy;
}

// 2. Fragment Shader (Multi-Pass Glitch Distortion)
// This pass uses randomized values derived from time and UV coordinates to calculate several layers of distortion (Block Tearing, Sinusoidal Waves, and Chromatic Aberration) before sampling the final color.

// OpenGL Shading Language

#version 300 es
precision highp float;
precision highp int;

// Inputs
in vec3 vVertexPosition;
in vec2 vTextureCoord;

// Uniforms
uniform sampler2D uTexture;
uniform float uTime;

// Output
out vec4 fragColor;

// --- Utility Functions ---

// PCG 2D Hash (used for pseudorandom number generation)
uvec2 pcg2d(uvec2 v) {
    v = v * 1664525u + 1013904223u;
    v.x += v.y * v.y * 1664525u + 1013904223u;
    v.y += v.x * v.x * 1664525u + 1013904223u;
    v ^= v >> 16;
    v.x += v.y * v.y * 1664525u + 1013904223u;
    v.y += v.x * v.x * 1664525u + 1013904223u;
    return v;
}

// Float random number generator using the PCG hash (results in [0, 1])
float randFibo(vec2 p) {
    uvec2 v = floatBitsToUint(p);
    v = pcg2d(v);
    uint r = v.x ^ v.y;
    return float(r) / float(0xffffffffu);
}

// --- Main Distortion Logic ---

void main() {
    vec2 uv = vTextureCoord;
    
    // --- Time and Parameters Setup ---
    
    // Time-based randomness, alternating every 2 seconds (0.5 Hz)
    float timeRand1 = randFibo(vec2(floor(uTime * 0.5) * 2. + 0.001, 0.5));
    float timeRand2 = randFibo(vec2(floor(uTime * 0.5) * 2. + 1.001, 0.5));
    
    // Glitch line size (horizontal and vertical quantization)
    float sizeX = 0.5000 * 0.2 * timeRand1; // Horizontal line size
    float sizeY = 0.5000 * 0.2 * timeRand2; // Vertical line size (less influential in typical glitch)
    
    // Quantized coordinates for glitch line calculation
    float floorY = floor(uv.y / sizeY) + 0.005;
    float floorX = floor(uv.x / sizeX) + 0.005;
    
    // Glitch factors
    float phase = 0.0000 * 0.01;
    float chromab = 0.5000 * 0.75; // Chromatic aberration strength
    float offset = 0.;
    
    // --- Block Tearing / Corruption ---
    
    // Block size (50x50, reduced by 0.5000 factor)
    vec2 blockSize = vec2(50.0, 50.0) * (1.0 - 0.5000); 
    
    // Quantize UV to block coordinates
    vec2 blockUV = floor(uv * blockSize) / blockSize;
    float blockRand = randFibo(blockUV); // Randomness per block
    float blockTimeRand = timeRand1;
    
    // Block Noise: Randomly selects blocks (80% chance for a block to be "active")
    float blockNoise = mix(
        1.,
        step(0.8, randFibo(vec2(blockTimeRand, blockRand))), // Returns 1 if rand > 0.8
        0.8000 // 80% contribution from the stepped noise
    );
    
    // Block offset magnitude
    float offsetX = 0.5000 * 0.5 * blockNoise; // Strong horizontal block offset
    float offsetY = 0.0000 * 0.5 * blockNoise; // Very weak vertical block offset
    
    // --- Line Tearing / Random Glitch Offset ---
    
    // Random value per horizontal line segment (floorY)
    float randY = randFibo(vec2(sin(floorY + offset + phase), 0.5));
    // Random value per vertical line segment (floorX)
    float randX = randFibo(vec2(cos(floorX + offset + phase), 0.5));
    
    // Glitch Modifiers: determines if a line segment should be displaced (sign determines direction)
    float glitchModX = max(0.005, sign(randY - 0.5 - (1. - 0.5000 * 2.) / 2.));
    float glitchModY = max(0.005, sign(randX - 0.5 - (1. - 0.5000 * 2.) / 2.));
    
    // Random displacement for X and Y
    float randOffX = randFibo(vec2(floorY + offset * glitchModX + phase, 0.7));
    float randOffY = randFibo(vec2(floorX + offset * glitchModY + phase, 0.9));
    
    // Final Offset: Scales random value by block offset magnitude
    float offX = (randOffX * offsetX - offsetX / 2.) / 5.;
    float offY = (randOffY * offsetY - offsetY / 2.) / 5.;
    
    offX = clamp(offX, -1.0, 1.0);
    offY = clamp(offY, -1.0, 1.0);
    
    // Apply final random/block offset to UVs if the glitch modifier is active
    uv.x = mix(uv.x, uv.x + offX * 2., glitchModX);
    uv.y = mix(uv.y, uv.y + offY * 2., glitchModY);
    
    // --- Sinusoidal Wave Distortion (Screen Wobble) ---
    
    float waveFreq = 30.0;
    float waveAmp = 0.005 * 0.2000; // Small amplitude
    float timeOffset = uTime * 0.05;
    
    // Rogue Scanline: creates large, infrequent horizontal displacement
    float sinY = sin((uv.y + 0.0000) * waveFreq * (1. - 0.5000) * 2. + timeOffset);
    float rogue = smoothstep(0., 2., sinY - 0.5) * 0.2 * 0.2000;
    
    float sinWaveX = sin(uv.y * waveFreq + uTime); // X displacement based on Y coordinate
    float sinWaveY = sin(uv.x * waveFreq + uTime); // Y displacement based on X coordinate
    
    // Apply wave distortion
    uv.x += sinWaveX * waveAmp + rogue;
    uv.y += sinWaveY * waveAmp;
    
    // Save the X wave displacement for use in Chromatic Aberration
    float waveX = sinWaveX * waveAmp + rogue * chromab * 0.2;
    
    // Clamp final UV to prevent border issues
    uv = clamp(uv, vec2(0.005), vec2(0.995));
    
    // --- Chromatic Aberration and Final Sample ---
    
    // Sample Green channel at the fully distorted UV
    vec4 color = texture(uTexture, uv);
    
    // Red Channel Offset: Sample Green UV with an additional, scaled offset applied backwards
    vec2 redOffset = vec2(
        clamp(uv.x + (glitchModX * -offX * chromab - waveX), 0.005, 0.995),
        clamp(uv.y + (glitchModX * -offY * chromab), 0.005, 0.995)
    );
    
    // Blue Channel Offset: Sample Green UV with an additional, scaled offset applied forwards
    vec2 blueOffset = vec2(
        clamp(uv.x + (glitchModX * offX * chromab + waveX), 0.005, 0.995),
        clamp(uv.y + (glitchModX * offY * chromab), 0.005, 0.995)
    );
    
    color.r = texture(uTexture, redOffset).r;
    color.b = texture(uTexture, blueOffset).b;
    
    fragColor = color;
}
```

## File: extracted/stylize/grain
```
// This shader implements a basic Filmic Grain or Noise effect, which adds random high-frequency fluctuations to the image to simulate the appearance of film grain or video noise. The effect uses a high-quality pseudorandom number generator (PCG hash) sampled per pixel.

// 1. Vertex Shader (Shared)
// OpenGL Shading Language

#version 300 es
precision mediump float;

// Attributes
in vec3 aVertexPosition;
in vec2 aTextureCoord;

// Uniforms
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat4 uTextureMatrix;

// Outputs
out vec2 vTextureCoord;
out vec3 vVertexPosition;

void main() {
    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
    vTextureCoord = (uTextureMatrix * vec4(aTextureCoord, 0.0, 1.0)).xy;
}
// 2. Fragment Shader (Noise Generation and Blend)
// This pass generates screen-space noise that is slightly animated over time and blends it additively with the original scene color.

// OpenGL Shading Language

#version 300 es
precision highp float;
precision highp int;

// Inputs
in vec3 vVertexPosition;
in vec2 vTextureCoord;

// Uniforms
uniform sampler2D uTexture;
uniform float uTime;
uniform vec2 uResolution;

// Output
out vec4 fragColor;

// --- Utility Functions ---

// Simple Addition Blend Mode
vec3 blend (int blendMode, vec3 src, vec3 dst) {
    // blendMode 1: Addition (src + dst)
    return src + dst;
}

// PCG 2D Hash (used for pseudorandom number generation)
uvec2 pcg2d(uvec2 v) {
    v = v * 1664525u + 1013904223u;
    v.x += v.y * v.y * 1664525u + 1013904223u;
    v.y += v.x * v.x * 1664525u + 1013904223u;
    v ^= v >> 16;
    v.x += v.y * v.y * 1664525u + 1013904223u;
    v.y += v.x * v.x * 1664525u + 1013904223u;
    return v;
}

// Float random number generator using the PCG hash (results in [0, 1])
float randFibo(vec2 p) {
    uvec2 v = floatBitsToUint(p);
    v = pcg2d(v);
    uint r = v.x ^ v.y;
    return float(r) / float(0xffffffffu);
}

// --- Main Function ---

void main() {
    vec2 uv = vTextureCoord;
    vec4 color = texture(uTexture, uv);

    // Alpha Clipping
    if(color.a <= 0.001) {
        fragColor = vec4(0);
        return;
    }
    
    vec2 st = uv;
    vec3 grainRGB = vec3(0);

    // Scale UV coordinates to screen pixels (to get consistent grain size)
    st *= uResolution;

    // Time delta for grain animation (changes every 20 seconds, or cycles smoothly over 20s)
    float delta = fract((floor(uTime) / 20.)); 
    
    // Noise Generation: 
    // The conditional path is disabled (0==1 is false).
    if(0 == 1) { 
        // Generates three independent random values for R, G, B (often looks like colored grain)
        grainRGB = vec3(
            randFibo(st + vec2(1, 2) + delta),
            randFibo(st + vec2(2, 3) + delta),
            randFibo(st + vec2(3, 4) + delta)
        );
    } else {
        // Generates one random value and applies it to R, G, B (monochromatic grain)
        // The seed uses pixel coordinates (`st`) plus a small time offset (`delta`).
        grainRGB = vec3(randFibo(st + vec2(delta)));
    }
    
    // --- Compositing ---
    
    // 1. Additive Blend: grainRGB + color.rgb (blends are clamped to [0, 1] by the GPU pipeline)
    vec3 blended = blend(1, grainRGB, color.rgb);
    
    // 2. Mix: Interpolate between original color and the blended color
    // A mix factor of 0.5000 is used, resulting in an average: (color.rgb + blended) / 2
    color.rgb = mix(color.rgb, blended, 0.5000);
    
    fragColor = color;
}
```
