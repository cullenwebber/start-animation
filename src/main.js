import './style.css';
import { VFX } from '@vfx-js/core';
import shader from './shader';

const init = () => {
    const logo = document.querySelector('#app');
    const video = document.querySelector('video');
    const timeContainer = document.querySelector('#time');

    const vfx = initVFX(logo);
    const vfxAnother = initVFX(video);

    function updateLoop() {
        vfx.update(logo);
        requestAnimationFrame(updateLoop);
    }

    updateTime(timeContainer);
    updateLoop();
};

const initVFX = (element) => {
    const vfx = new VFX();
    vfx.add(element, {
        shader,
        uniforms: {
            curvature: new Float32Array([3, 3]),
            screenResolution: new Float32Array([300, 400]),
            scanLineOpacity: new Float32Array([0.9, 0.25]),
            vignetteOpacity: 1.0,
            uTime: () => performance.now() / 1000,
        },
        glslVersion: '300 es',
    });
    return vfx;
};

const updateTime = (timeContainer) => {
    const startTime = performance.now();

    const update = () => {
        const elapsed = Math.floor((performance.now() - startTime) / 1000) + 1;

        const hours = String(Math.floor(elapsed / 3600)).padStart(2, '0');
        const minutes = String(Math.floor((elapsed % 3600) / 60)).padStart(
            2,
            '0'
        );
        const seconds = String(elapsed % 60).padStart(2, '0');

        timeContainer.textContent = `${hours}:${minutes}:${seconds}`;

        requestAnimationFrame(update);
    };

    update();
};

document.addEventListener('DOMContentLoaded', () => init());
