<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import {
        Music,
        Play,
        Square,
        Volume2,
        Settings,
        RefreshCw,
    } from "lucide-svelte";

    // --- Audio Engine ---
    class AudioEngine {
        private ctx: AudioContext | null = null;
        private masterGain: GainNode | null = null;

        constructor() {
            if (typeof window !== "undefined") {
                this.ctx = new (window.AudioContext ||
                    (window as any).webkitAudioContext)();
                this.masterGain = this.ctx.createGain();
                this.masterGain.connect(this.ctx.destination);
                this.masterGain.gain.value = 0.5; // Master volume
            }
        }

        resume() {
            if (this.ctx?.state === "suspended") {
                this.ctx.resume();
            }
        }

        playKick(time: number) {
            if (!this.ctx || !this.masterGain) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.frequency.setValueAtTime(150, time);
            osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
            gain.gain.setValueAtTime(1, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

            osc.start(time);
            osc.stop(time + 0.5);
        }

        playSnare(time: number) {
            if (!this.ctx || !this.masterGain) return;

            // Noise
            const bufferSize = this.ctx.sampleRate;
            const buffer = this.ctx.createBuffer(
                1,
                bufferSize,
                this.ctx.sampleRate,
            );
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            const noiseFilter = this.ctx.createBiquadFilter();
            noiseFilter.type = "highpass";
            noiseFilter.frequency.value = 1000;
            const noiseGain = this.ctx.createGain();

            noise.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(this.masterGain);

            noiseGain.gain.setValueAtTime(1, time);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
            noise.start(time);
            noise.stop(time + 0.2);

            // Snap (oscillator)
            const osc = this.ctx.createOscillator();
            const oscGain = this.ctx.createGain();
            osc.connect(oscGain);
            oscGain.connect(this.masterGain);
            osc.type = "triangle";
            osc.frequency.setValueAtTime(100, time);
            oscGain.gain.setValueAtTime(0.7, time);
            oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
            osc.start(time);
            osc.stop(time + 0.1);
        }

        playHiHat(time: number, open = false) {
            if (!this.ctx || !this.masterGain) return;

            const bufferSize = this.ctx.sampleRate;
            const buffer = this.ctx.createBuffer(
                1,
                bufferSize,
                this.ctx.sampleRate,
            );
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const bandpass = this.ctx.createBiquadFilter();
            bandpass.type = "bandpass";
            bandpass.frequency.value = 10000;

            const highpass = this.ctx.createBiquadFilter();
            highpass.type = "highpass";
            highpass.frequency.value = 7000;

            const gain = this.ctx.createGain();

            noise.connect(bandpass);
            bandpass.connect(highpass);
            highpass.connect(gain);
            gain.connect(this.masterGain);

            gain.gain.setValueAtTime(0.6, time);
            gain.gain.exponentialRampToValueAtTime(
                0.01,
                time + (open ? 0.4 : 0.05),
            );

            noise.start(time);
            noise.stop(time + (open ? 0.4 : 0.05));
        }

        playSynth(time: number, note: string) {
            if (!this.ctx || !this.masterGain) return;
            const freq = this.noteToFreq(note);
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = "square"; // Retro sound
            osc.frequency.setValueAtTime(freq, time);

            osc.connect(gain);
            gain.connect(this.masterGain);

            gain.gain.setValueAtTime(0.3, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);

            osc.start(time);
            osc.stop(time + 0.3);
        }

        private noteToFreq(note: string): number {
            const notes = [
                "C",
                "C#",
                "D",
                "D#",
                "E",
                "F",
                "F#",
                "G",
                "G#",
                "A",
                "A#",
                "B",
            ];
            const octave = parseInt(note.slice(-1));
            const key = notes.indexOf(note.slice(0, -1));
            if (key === -1) return 440;
            return 440 * Math.pow(2, (key - 9) / 12 + (octave - 4));
        }

        get currentTime() {
            return this.ctx?.currentTime || 0;
        }
    }

    // --- Component Logic ---
    let engine: AudioEngine;
    let isPlaying = $state(false);
    let currentStep = $state(0);
    let bpm = $state(120);
    let steps = 16;
    let nextNoteTime = 0;
    let timerID: number | null = null;
    const lookahead = 25.0; // ms
    const scheduleAheadTime = 0.1; // s

    // Instrument Definitions
    type InstrumentType = "kick" | "snare" | "hihat" | "synth";
    interface Instrument {
        name: string;
        type: InstrumentType;
        note?: string; // For synth
        color: string;
    }

    const instruments: Instrument[] = [
        { name: "Kick", type: "kick", color: "var(--builder-accent)" },
        { name: "Snare", type: "snare", color: "var(--tool-design)" },
        { name: "HiHat", type: "hihat", color: "var(--tool-data)" },
        {
            name: "Synth C",
            type: "synth",
            note: "C4",
            color: "var(--tool-code)",
        },
        {
            name: "Synth E",
            type: "synth",
            note: "E4",
            color: "var(--tool-code)",
        },
        {
            name: "Synth G",
            type: "synth",
            note: "G4",
            color: "var(--tool-code)",
        },
        {
            name: "Synth B",
            type: "synth",
            note: "B4",
            color: "var(--tool-code)",
        },
    ];

    // Grid State: [instrumentIndex][stepIndex]
    let grid = $state<boolean[][]>(
        Array(instruments.length)
            .fill(null)
            .map(() => Array(steps).fill(false)),
    );

    onMount(() => {
        engine = new AudioEngine();
        // Default beat pattern
        grid[0][0] = true;
        grid[0][4] = true;
        grid[0][8] = true;
        grid[0][12] = true; // Kick
        grid[2][2] = true;
        grid[2][6] = true;
        grid[2][10] = true;
        grid[2][14] = true; // HiHat
    });

    onDestroy(() => {
        stop();
    });

    function nextStep() {
        const secondsPerBeat = 60.0 / bpm;
        // 16th notes = 0.25 beat
        nextNoteTime += 0.25 * secondsPerBeat;
        currentStep = (currentStep + 1) % steps;
    }

    function scheduleNote(stepNumber: number, time: number) {
        if (!engine) return;

        instruments.forEach((inst, index) => {
            if (grid[index][stepNumber]) {
                switch (inst.type) {
                    case "kick":
                        engine.playKick(time);
                        break;
                    case "snare":
                        engine.playSnare(time);
                        break;
                    case "hihat":
                        engine.playHiHat(time);
                        break;
                    case "synth":
                        if (inst.note) engine.playSynth(time, inst.note);
                        break;
                }
            }
        });
    }

    function scheduler() {
        if (!engine) return;
        // While there are notes that will need to play before the next interval,
        // schedule them and advance the pointer.
        while (nextNoteTime < engine.currentTime + scheduleAheadTime) {
            scheduleNote(currentStep, nextNoteTime);
            nextStep();
        }
        timerID = window.setTimeout(scheduler, lookahead);
    }

    function togglePlay() {
        if (!engine) return;
        engine.resume();

        if (isPlaying) {
            stop();
        } else {
            isPlaying = true;
            currentStep = 0;
            nextNoteTime = engine.currentTime + 0.05; // Short startup delay
            scheduler();
        }
    }

    function stop() {
        isPlaying = false;
        if (timerID) {
            clearTimeout(timerID);
            timerID = null;
        }
    }

    function toggleCell(instIndex: number, stepIndex: number) {
        grid[instIndex][stepIndex] = !grid[instIndex][stepIndex];
    }

    function clearGrid() {
        grid = grid.map((row) => row.fill(false));
    }
</script>

<div class="h-full w-full flex flex-col p-4 overflow-hidden">
    <!-- Controls -->
    <div
        class="flex flex-wrap items-center gap-4 mb-4 p-4 bg-[var(--builder-bg-secondary)] rounded-xl border border-[var(--builder-border)]"
    >
        <div class="flex items-center gap-2 mr-auto min-w-max">
            <div
                class="w-10 h-10 rounded-full bg-[var(--builder-accent)]/10 flex items-center justify-center"
            >
                <Music class="w-5 h-5 text-[var(--builder-accent)]" />
            </div>
            <div>
                <h2 class="font-bold text-[var(--builder-text-primary)]">
                    Beat Maker
                </h2>
                <div class="text-xs text-[var(--builder-text-secondary)]">
                    Step Sequencer
                </div>
            </div>
        </div>

        <div class="flex items-center gap-4 flex-wrap justify-end flex-1">
            <div class="flex items-center gap-2">
                <span
                    class="text-xs font-mono text-[var(--builder-text-secondary)]"
                    >BPM</span
                >
                <input
                    type="range"
                    min="60"
                    max="180"
                    bind:value={bpm}
                    class="w-24 accent-[var(--builder-accent)] h-1 bg-[var(--builder-border)] rounded-full appearance-none"
                />
                <span
                    class="text-xs font-mono w-8 text-right text-[var(--builder-text-primary)]"
                    >{bpm}</span
                >
            </div>

            <div
                class="h-8 w-px bg-[var(--builder-border)] hidden sm:block"
            ></div>

            <div class="flex items-center gap-2">
                <button
                    onclick={clearGrid}
                    class="p-2 text-[var(--builder-text-secondary)] hover:text-[var(--builder-text-primary)] hover:bg-[var(--builder-bg-tertiary)] rounded-full transition-colors"
                    title="Clear Grid"
                >
                    <RefreshCw class="w-4 h-4" />
                </button>

                <button
                    onclick={togglePlay}
                    class="flex items-center gap-2 px-4 py-2 rounded-full font-medium text-white transition-all active:scale-95 shadow-lg shadow-[var(--builder-accent)]/20
            {isPlaying
                        ? 'bg-red-500 hover:bg-red-600'
                        : 'bg-[var(--builder-accent)] hover:bg-[var(--builder-accent-hover)]'}"
                >
                    {#if isPlaying}
                        <Square class="w-4 h-4 fill-current" />
                        <span>Stop</span>
                    {:else}
                        <Play class="w-4 h-4 fill-current" />
                        <span>Play</span>
                    {/if}
                </button>
            </div>
        </div>
    </div>

    <!-- Sequencer Grid -->
    <div
        class="flex-1 overflow-auto bg-[var(--builder-bg-secondary)] rounded-xl border border-[var(--builder-border)] p-4 relative"
    >
        <div class="grid gap-2 min-w-max">
            {#each instruments as inst, i}
                <div class="flex items-center gap-2 group">
                    <!-- Labels (Sticky) -->
                    <div
                        class="w-20 text-xs font-medium text-[var(--builder-text-secondary)] text-right pr-2 sticky left-0 bg-[var(--builder-bg-secondary)] z-10 transition-colors group-hover:text-[var(--builder-text-primary)] truncate"
                    >
                        {inst.name}
                    </div>

                    <!-- Steps -->
                    <div class="flex gap-1">
                        {#each Array(steps) as _, step}
                            {@const isActive = grid[i][step]}
                            {@const isCurrent =
                                isPlaying && currentStep === step}
                            {@const isBeat = step % 4 === 0}
                            <button
                                class="w-8 h-10 rounded-sm border transition-all duration-75 relative shrink-0"
                                style="
                    background-color: {isActive ? inst.color : 'transparent'};
                    border-color: {isActive
                                    ? inst.color
                                    : 'var(--builder-border)'};
                    opacity: {isCurrent
                                    ? isActive
                                        ? 1
                                        : 0.5
                                    : isActive
                                      ? 0.9
                                      : 0.2};
                    transform: {isCurrent ? 'scale(1.05)' : 'scale(1)'};
                  "
                                class:border-l-2={isBeat && !isActive}
                                class:border-l-[var(--builder-text-secondary)]={isBeat &&
                                    !isActive}
                                onclick={() => toggleCell(i, step)}
                            >
                                {#if isCurrent}
                                    <div
                                        class="absolute inset-0 bg-white/20 animate-pulse"
                                    ></div>
                                {/if}
                            </button>
                        {/each}
                    </div>
                </div>
            {/each}
        </div>

        <!-- Step Indicators (Bottom) -->
        <div class="flex gap-1 mt-2 ml-[5.5rem] min-w-max">
            {#each Array(steps) as _, step}
                <div class="w-8 flex justify-center shrink-0">
                    <div
                        class="w-1 h-1 rounded-full bg-[var(--builder-accent)] transition-opacity duration-75"
                        style="opacity: {isPlaying && currentStep === step
                            ? 1
                            : 0}"
                    ></div>
                </div>
            {/each}
        </div>
    </div>
</div>

<style>
    /* Custom scrollbar for grid */
    ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
    }
    ::-webkit-scrollbar-track {
        background: transparent;
    }
    ::-webkit-scrollbar-thumb {
        background: var(--builder-border);
        border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
        background: var(--builder-text-secondary);
    }
</style>
