/* =====================  materials & shader patches  ===================== */
const U = {
  time: { value: 0 },
  sunDir: { value: V3(-0.55, 0.5, 0.62).normalize() },
  sunCol: { value: C(0xfff0d6) },
};
const SUN_DIR = U.sunDir.value;

/* aerial perspective: exponential (not squared) fog, thicker near the valley floor, bluer with distance */
THREE.ShaderChunk.fog_pars_vertex = `#ifdef USE_FOG\n varying float vFogDepth; varying float vFogY;\n#endif`;
THREE.ShaderChunk.fog_vertex = `#ifdef USE_FOG\n vFogDepth = - mvPosition.z; vFogY = cameraPosition.y + ( transpose( mat3( viewMatrix ) ) * mvPosition.xyz ).y;\n#endif`;
THREE.ShaderChunk.fog_pars_fragment = `#ifdef USE_FOG\n uniform vec3 fogColor; varying float vFogDepth; varying float vFogY;\n #ifdef FOG_EXP2\n uniform float fogDensity;\n #else\n uniform float fogNear; uniform float fogFar;\n #endif\n#endif`;
THREE.ShaderChunk.fog_fragment = /* glsl */`
#ifdef USE_FOG
  #ifdef FOG_EXP2
    float hgt = mix( 1.0, 0.42, smoothstep( 0.0, 520.0, vFogY ) );
    float fogFactor = 1.0 - exp( - fogDensity * vFogDepth * hgt );
  #else
    float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
  #endif
  vec3 fogC = mix( fogColor, fogColor * vec3( 0.8, 0.92, 1.1 ), smoothstep( 0.2, 0.9, fogFactor ) );
  gl_FragColor.rgb = mix( gl_FragColor.rgb, fogC, fogFactor );
#endif
`;

const GLSL_WIND = /* glsl */`
vec3 windAt(vec3 wp, float t){
  float gust = 0.55 + 0.45 * sin(t*0.31 + wp.x*0.021) * sin(t*0.17 + wp.z*0.027 + 1.3);
  float s1 = sin(t*1.21 + wp.x*0.33 + wp.z*0.21);
  float s2 = sin(t*2.63 + wp.x*0.91 - wp.z*0.67) * 0.45;
  float s3 = sin(t*4.9 + dot(wp.xz, vec2(2.3, 1.9)) + wp.y*1.7) * 0.18;
  float s = (s1 + s2 + s3) * gust;
  return vec3(0.85, 0.08*s, 0.4) * s;
}
`;

/* patch a MeshStandardMaterial:
 *   vary  : low-frequency world-space colour variation (painterly unevenness)
 *   ao    : darken surfaces near ground level (contact occlusion)
 *   wind  : 'attr' (merged foliage, weight in aWind) | 'height' (instanced tufts, weight = local y)
 *   foliage: wrap lighting + sun transmission */
function patchMat(mat, { vary = 0.08, ao = 0, wind = null, windAmp = 1, foliage = null, uvWorld = 0, rock = null } = {}) {
  mat.userData.patch = { vary, ao, wind, foliage, rock: !!rock };
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = U.time; if (rock) sh.uniforms.uRock = { value: rock };
    let vs = sh.vertexShader, fs = sh.fragmentShader;
    vs = 'varying vec3 vWPos;\nvarying vec3 vWNormal;\nuniform float uTime;\nattribute float aWind;\n' + GLSL_WIND + vs;
    vs = vs.replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n vWNormal = normalize(mat3(modelMatrix) * objectNormal);');
    let windCode = '';
    if (wind === 'attr') windCode = `transformed += windAt(vWPos, uTime) * aWind * ${windAmp.toFixed(3)};`;
    if (wind === 'height') windCode = `{ float wh = max(position.y, 0.0); transformed.xz += windAt(vWPos, uTime).xz * wh * wh * ${windAmp.toFixed(3)}; }`;
    vs = vs.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec4 wvp = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        wvp = instanceMatrix * wvp;
      #endif
      wvp = modelMatrix * wvp; vWPos = wvp.xyz;
      ${windCode}`);
    fs = 'varying vec3 vWPos;\nvarying vec3 vWNormal;\nuniform float uTime;\n' + (rock ? 'uniform sampler2D uRock;\n' : '') + GLSL_NOISE + fs;
    fs = fs.replace('#include <color_fragment>', `#include <color_fragment>
      {
        float macro = wv_fbm(vWPos.xz * 0.11 + vWPos.y * 0.07);
        float micro = wv_noise(vWPos.xz * 1.7 + vWPos.y * 1.3);
        diffuseColor.rgb *= 1.0 + (macro - 0.5) * ${(vary * 2).toFixed(3)} + (micro - 0.5) * ${(vary * 0.5).toFixed(3)};
        ${rock ? `{ vec3 wn = normalize(vWNormal); float steep = smoothstep(0.8, 0.58, wn.y);
          if (steep > 0.001) { vec3 bw = pow(abs(wn), vec3(4.0)); bw /= (bw.x + bw.y + bw.z);
            vec3 rk = texture2D(uRock, vWPos.zy * 0.11).rgb * bw.x + texture2D(uRock, vWPos.xy * 0.11).rgb * bw.z + texture2D(uRock, vWPos.xz * 0.11).rgb * bw.y;
            float lich = smoothstep(0.55, 0.75, wv_fbm(vWPos.xz * 0.05 + vWPos.y * 0.04));
            rk = mix(rk * vec3(0.98, 0.94, 0.88), rk * vec3(0.78, 0.86, 0.62), lich * 0.6);
            diffuseColor.rgb = mix(diffuseColor.rgb, rk, steep); }
          float far = smoothstep(260.0, 900.0, length(vWPos.xz - vec2(20.0, -150.0)));
          float woods = smoothstep(0.42, 0.62, wv_fbm(vWPos.xz * 0.009 + 4.0)) * smoothstep(0.55, 0.85, wn.y) * far;
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.12, 0.2, 0.09), woods * 0.75);
          diffuseColor.rgb *= mix(1.0, 0.72 + 0.5 * wv_fbm(vWPos.xz * 0.004), far);
          diffuseColor.rgb *= mix(0.72, 1.0, smoothstep(0.45, 0.92, wn.y)); }` : ''}
        ${ao ? `float gAO = mix(${(1 - ao).toFixed(3)}, 1.0, smoothstep(-0.1, 1.2, vWPos.y));
        diffuseColor.rgb *= gAO;` : ''}
      }`);
    if (foliage) {
      const [wrap, trans] = foliage;
      // foliage uses volumetric (radial) normals: never flip them on back faces
      fs = fs.replace('#include <normal_fragment_begin>', THREE.ShaderChunk.normal_fragment_begin.replace('normal *= faceDirection;', ''));
      fs = fs.replace('#include <lights_physical_pars_fragment>', THREE.ShaderChunk.lights_physical_pars_fragment.replace(
        'float dotNL = saturate( dot( geometryNormal, directLight.direction ) );',
        `float dotNLr = dot( geometryNormal, directLight.direction );
         float dotNL = saturate( dotNLr );
         float wrapNL = saturate( ( dotNLr + ${wrap.toFixed(3)} ) / ( 1.0 + ${wrap.toFixed(3)} ) );
         reflectedLight.directDiffuse += directLight.color * BRDF_Lambert( material.diffuseColor ) * ( max( wrapNL - dotNL, 0.0 )
           + ${trans.toFixed(3)} * ( pow( saturate( dot( -geometryViewDir, directLight.direction ) ), 4.0 ) * 2.4 + saturate( -dotNLr ) * 0.8 ) );`));
    }
    sh.vertexShader = vs; sh.fragmentShader = fs;
  };
  mat.customProgramCacheKey = () => JSON.stringify(mat.userData.patch);
  return mat;
}

function texRep(tex, m) { const t = tex.clone(); t.repeat.set(1 / m, 1 / m); t.needsUpdate = true; return t; }

const MAT = {};
function buildMaterials() {
  const std = (o) => new THREE.MeshStandardMaterial(Object.assign({ vertexColors: true, roughness: 0.9, metalness: 0 }, o));
  MAT.plaster = patchMat(std({ map: texRep(TEX.plaster, 3.2), bumpMap: texRep(TEX.plasterBump, 3.2), bumpScale: 0.6, roughness: 0.94 }), { vary: 0.09, ao: 0.35 });
  MAT.stone = patchMat(std({ map: texRep(TEX.stone, 2.6), bumpMap: texRep(TEX.stoneBump, 2.6), bumpScale: 2.2, roughness: 0.92 }), { vary: 0.1, ao: 0.35 });
  MAT.trim = patchMat(std({ map: texRep(TEX.trim, 1.6), roughness: 0.82 }), { vary: 0.06, ao: 0.25 });
  MAT.roof = patchMat(std({ map: texRep(TEX.roof, ROOF_TEX_M), bumpMap: texRep(TEX.roofBump, ROOF_TEX_M), bumpScale: 1.6, roughness: 0.78 }), { vary: 0.12 });
  MAT.slate = patchMat(std({ map: texRep(TEX.slate, ROOF_TEX_M), bumpMap: texRep(TEX.slateBump, ROOF_TEX_M), bumpScale: 1.2, roughness: 0.62 }), { vary: 0.1 });
  MAT.wood = patchMat(std({ map: texRep(TEX.wood, 1.2), roughness: 0.78 }), { vary: 0.06, ao: 0.2 });
  MAT.metal = std({ color: 0x2e2c2b, roughness: 0.42, metalness: 0.65 });
  MAT.plain = patchMat(std({ roughness: 0.82 }), { vary: 0.05 });
  MAT.glass = std({ map: TEX.glass, roughness: 0.06, metalness: 0.1, envMapIntensity: 1.6 });
  MAT.glass.userData.noCast = true;
  MAT.awning = patchMat(std({ map: TEX.awning, roughness: 0.95, side: THREE.DoubleSide }), { vary: 0.04 });
  MAT.cobble = patchMat(std({ map: texRep(TEX.cobble, COBBLE_M), bumpMap: texRep(TEX.cobbleBump, COBBLE_M), bumpScale: 2.6, roughness: 0.88 }), { vary: 0.1 });
  MAT.flag = patchMat(std({ map: texRep(TEX.flag, FLAG_M), bumpMap: texRep(TEX.flagBump, FLAG_M), bumpScale: 1.4, roughness: 0.86 }), { vary: 0.08 });
  MAT.ground = patchMat(std({ map: TEX.ground, roughness: 0.97 }), { vary: 0.14, rock: TEX.rock });
  MAT.bark = patchMat(std({ map: TEX.bark, roughness: 0.95 }), { vary: 0.1 });
  MAT.rock = patchMat(std({ map: texRep(TEX.rock, 8), roughness: 0.95 }), { vary: 0.12 });
  MAT.cliff = patchMat(std({ roughness: 0.95 }), { vary: 0.14, rock: TEX.rock });
  MAT.leaves = patchMat(std({ map: TEX.leaves, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.85 }), { vary: 0.14, wind: 'attr', windAmp: 0.09, foliage: [0.45, 0.55] });
  MAT.ivy = patchMat(std({ map: TEX.ivy, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.75 }), { vary: 0.12, wind: 'attr', windAmp: 0.02, foliage: [0.35, 0.45] });
  MAT.grass = patchMat(std({ map: TEX.grass, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.9 }), { vary: 0.16, wind: 'height', windAmp: 0.09, foliage: [0.5, 0.4] });
  MAT.flower = patchMat(std({ roughness: 0.7, side: THREE.DoubleSide }), { vary: 0.06, wind: 'height', windAmp: 0.12, foliage: [0.4, 0.55] });
  MAT.bush = patchMat(std({ map: TEX.leavesDark, alphaTest: 0.42, side: THREE.DoubleSide, roughness: 0.85 }), { vary: 0.12, wind: 'height', windAmp: 0.05, foliage: [0.45, 0.45] });
  MAT.sign = std({ map: TEX.sign, roughness: 0.7 });
  MAT.chalk = std({ map: TEX.chalk, roughness: 0.95 });
  MAT.wicker = patchMat(std({ map: texRep(TEX.wicker, 0.25), roughness: 0.9 }), { vary: 0.05 });
  MAT.bread = patchMat(std({ color: 0xffffff, roughness: 0.72 }), { vary: 0.15 });
  MAT.cloth = patchMat(std({ roughness: 0.92, side: THREE.DoubleSide }), { vary: 0.04 });
  MAT.interior = new THREE.MeshBasicMaterial({ vertexColors: true });
  MAT.interior.userData.noCast = true;
  MAT.glassClear = std({ color: 0xffffff, transparent: true, opacity: 0.16, roughness: 0.04, metalness: 0.0, envMapIntensity: 2.2, depthWrite: false });
  MAT.glassClear.userData.noCast = true;
  MAT.fascia = std({ map: TEX.fascia, roughness: 0.6 });
  for (const k in MAT) MAT[k].name = k;
}
