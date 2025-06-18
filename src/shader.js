const shader = /*glsl*/ `precision highp float;

#define PI 3.1415926538

// Samplers
uniform sampler2D src;

// Parameters
uniform vec2 curvature;
uniform vec2 resolution;
uniform vec2 screenResolution;
uniform vec2 scanLineOpacity;
uniform float vignetteOpacity;
uniform float uTime;

out vec4 fragColor;

vec2 curveRemapUV(vec2 uv)
{
    uv = uv * 2.0 - 1.0;
    vec2 offset = abs(uv.yx) / vec2(curvature.x, curvature.y);
    uv = uv + uv * offset * offset;
    uv = uv * 0.5 + 0.5;
    return uv;
}

vec4 scanLineIntensity(float uv, float resolution, float opacity)
{
    float intensity = sin(uv * resolution * PI * 2.0);
    intensity = ((0.5 * intensity) + 0.5) * 0.9 + 0.1;
    return vec4(vec3(pow(intensity, opacity)), 1.0);
}

vec4 vignetteIntensity(vec2 uv, vec2 resolution, float opacity)
{
    float intensity = uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y);
    return vec4(vec3(clamp(pow((resolution.x / 4.0) * intensity, opacity), 0.0, 1.0)), 1.0);
}

// Enhanced phosphor glow effect with more realistic color bleeding
vec3 phosphorGlow(vec2 uv, vec4 color) {
    vec2 pixelPos = uv * screenResolution;
    vec2 subPixel = fract(pixelPos * 0.75); // Slightly larger phosphor dots
    
    // More pronounced RGB sub-pixel separation
    vec3 phosphorMask = vec3(
        smoothstep(0.1, 0.4, subPixel.x) * smoothstep(0.6, 0.3, subPixel.x),
        smoothstep(0.25, 0.55, subPixel.x) * smoothstep(0.85, 0.55, subPixel.x),
        smoothstep(0.6, 0.9, subPixel.x)
    );
    
    // Enhanced phosphor bleeding and glow
    vec3 phosphorColor = color.rgb * (0.7 + 0.4 * phosphorMask);
    
    // Stronger phosphor persistence with vintage green tint
    float brightness = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    phosphorColor += brightness * 0.08 * vec3(0.15, 0.9, 0.25);
    
    return phosphorColor;
}

// More realistic chromatic aberration - now works with any input
vec3 chromaticAberrationOnImage(vec3 inputColor, vec2 uv) {
    vec2 distanceFromCenter = abs(uv - 0.5) * 0.5 + 0.75;
    float aberrationStrength = dot(distanceFromCenter, distanceFromCenter) * 0.0015;
    
    // Apply chromatic shift to the input color
    vec3 color = inputColor;
    
    // Simulate RGB channel separation by shifting the color components
    vec2 redOffset = vec2(aberrationStrength * 1.2, aberrationStrength * 0.8);
    vec2 blueOffset = vec2(-aberrationStrength * 0.8, -aberrationStrength * 1.1);
    
    // Sample neighboring pixels for the shifted channels
    vec2 texelSize = 1.0 / screenResolution;
    
    color.r = texture(src, uv + redOffset).r;
    color.g = inputColor.g; // Keep original green
    color.b = texture(src, uv + blueOffset).b;
    
    return color;
}

// Simple, visible CRT flicker
float crtFlicker(vec2 uv, float time) {
    // Basic brightness flicker - much more dramatic
    float flicker = 1.0;
    
    // Add some random-looking variation
    flicker *= 0.9 + (0.1 * cos(tan(time * 2.0)));
    
    // Horizontal line interference
    float lines = 1.0 + 0.2 * sin(uv.y * 15.0 + time * 50.0);
    
    return flicker * lines;
}

// Vintage color correction with aged phosphor simulation
vec3 vintageColorCorrection(vec3 color) {
    // Simulate aged phosphors - slightly faded and shifted
    color.r *= 1.0; // Red phosphor degrades slightly
    color.g *= 1.05; // Green stays strong (P1 phosphor characteristic)
    color.b *= 1.0; // Blue fades more over time
    
    // Add vintage warmth and slight desaturation
    float luminance = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(vec3(luminance), color, 0.85); // Slight desaturation
    
    // Warm temperature shift
    color.r *= 1.1;
    color.b *= 1.4;
    
    // Gentle contrast curve for vintage look
    color = pow(color, vec3(0.95));
    
    return color;
}

// Subtle blur effect for vintage softness
vec3 vintageBlur(sampler2D tex, vec2 uv) {
    vec2 texelSize = 0.85 / screenResolution;
    vec3 color = vec3(0.0);
    
    // Simple 3x3 blur with weighted center
    color += texture(tex, uv + vec2(-texelSize.x, -texelSize.y)).rgb * 0.175;
    color += texture(tex, uv + vec2(0.0, -texelSize.y)).rgb * 0.175;
    color += texture(tex, uv + vec2(texelSize.x, -texelSize.y)).rgb * 0.175;
    color += texture(tex, uv + vec2(-texelSize.x, 0.0)).rgb * 0.175;
    color += texture(tex, uv).rgb * 0.3; // Strong center weight
    color += texture(tex, uv + vec2(texelSize.x, 0.0)).rgb * 0.175;
    color += texture(tex, uv + vec2(-texelSize.x, texelSize.y)).rgb * 0.175;
    color += texture(tex, uv + vec2(0.0, texelSize.y)).rgb * 0.175;
    color += texture(tex, uv + vec2(texelSize.x, texelSize.y)).rgb * 0.175;
    return color;
}

// Enhanced scanlines with more realistic intensity variation
float enhancedScanlines(vec2 uv) {
    float scanlineY = sin(uv.y * screenResolution.y * PI);
    float scanlineX = sin(uv.x * screenResolution.x * PI * 0.5); // Subtle horizontal structure
    
    // Varying scanline intensity
    float intensity = 0.88 + 0.12 * scanlineY * (0.7 + 0.3 * scanlineX);
    
    // Add slight scanline movement/shimmer
    intensity += 0.1 * sin(uv.y * screenResolution.y * PI * 2.0 + uTime * 5.0);
    
    return intensity;
}

void main(void) 
{
    vec2 vUv = gl_FragCoord.xy / resolution.xy;
    vec2 remappedUV = curveRemapUV(vUv);
    
    // Apply subtle blur first for vintage softness
    vec3 blurredColor = vintageBlur(src, remappedUV);
    
    // Apply chromatic aberration to blurred image
    vec3 aberratedColor = chromaticAberrationOnImage(blurredColor, remappedUV);
    
    // Blend blur with sharp image for realistic look
    vec4 baseColor = vec4(mix(blurredColor, aberratedColor, 0.6), 1.0);
    
    // Apply phosphor glow effect
    baseColor.rgb = phosphorGlow(remappedUV, baseColor);
    
    // Apply vintage color correction
    baseColor.rgb = vintageColorCorrection(baseColor.rgb);
    
    // Apply CRT flicker effect
    float flickerAmount = crtFlicker(vUv, uTime);
    baseColor.rgb *= flickerAmount;
    
    // Apply original vignetting and basic scanlines
    // baseColor *= vignetteIntensity(remappedUV, screenResolution, vignetteOpacity);
    baseColor *= scanLineIntensity(remappedUV.x, screenResolution.y, scanLineOpacity.x);
    baseColor *= scanLineIntensity(remappedUV.y, screenResolution.x, scanLineOpacity.y);
    
    // Enhanced scanlines for more realism
    float scanlineIntensity = enhancedScanlines(remappedUV);
    baseColor.rgb *= scanlineIntensity;
    
    // Enhanced edge darkening for more realistic curvature
    float distanceFromCenter = length(remappedUV - 0.5);
    float edgeDarkening = 1.0 - smoothstep(0.25, 0.8, distanceFromCenter) * 0.25;
    baseColor.rgb *= edgeDarkening;
    
    // Add subtle corner darkening (typical of old CRTs)
    vec2 cornerDist = abs(remappedUV - 0.5);
    float cornerDarkening = 1.0 - smoothstep(0.3, 0.5, max(cornerDist.x, cornerDist.y)) * 0.15;
    baseColor.rgb *= cornerDarkening;
    
    // Add very subtle random noise for texture
    float noise = (sin(vUv.x * 1247.1) * sin(vUv.y * 1531.7) * sin(uTime * 0.1)) * 0.01;
    baseColor.rgb += noise;

    if (remappedUV.x < 0.0 || remappedUV.y < 0.0 || remappedUV.x > 1.0 || remappedUV.y > 1.0){
        fragColor = vec4(0.0, 0.0, 0.0, 1.0);
    } else {
        fragColor = baseColor;
    }
}
`;

export default shader;
