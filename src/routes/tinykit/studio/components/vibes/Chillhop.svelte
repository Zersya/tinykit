<script lang="ts">
  import Icon from "@iconify/svelte";
  import { onMount } from "svelte";

  let isMuted = $state(true); // Start muted so autoplay works (browser requirement)

  onMount(() => {
    const stored = localStorage.getItem("tinykit-studio-mute");
    if (stored !== null) {
      isMuted = stored === "true";
    }
  });

  function toggleMute() {
    isMuted = !isMuted;
    localStorage.setItem("tinykit-studio-mute", String(isMuted));
  }
</script>

<div
  class="flex flex-col items-center justify-center space-y-6 max-w-3xl mx-auto px-8"
>
  <!-- YouTube Player -->
  <div
    class="border-2 border-[#2a2a2a] rounded-lg overflow-hidden bg-black"
    style="width: 600px; height: 340px;"
  >
    <iframe
      width="600"
      height="340"
      src="https://www.youtube-nocookie.com/embed/5yx6BWlEVcY?autoplay=1&mute={isMuted
        ? '1'
        : '0'}&loop=1&playlist=5yx6BWlEVcY"
      title="Chillhop Stream"
      frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen
    ></iframe>
  </div>

  <!-- Controls -->
  <div class="flex items-center space-x-4">
    <button
      onclick={toggleMute}
      class="flex items-center justify-center w-10 h-10 border border-[#2a2a2a] text-gray-400 hover:border-orange-500 hover:text-orange-500 transition-colors rounded-full"
      title={isMuted ? "Unmute" : "Mute"}
    >
      <Icon
        icon={isMuted
          ? "heroicons:speaker-x-mark-20-solid"
          : "heroicons:speaker-wave-20-solid"}
        class="w-5 h-5"
      />
    </button>
  </div>

  <!-- Info -->
  <div class="text-gray-600 text-xs font-sans text-center space-y-1">
    <div class="flex items-center justify-center gap-2">
      <Icon icon="heroicons:musical-note-20-solid" class="w-3.5 h-3.5" />
      <span>Smooth jazz vibes</span>
    </div>
    <p class="text-gray-700 mt-2">For when code needs a soundtrack</p>
  </div>
</div>
