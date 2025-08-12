<template>
    <Teleport to=".container[x-data]" :key="key">
        <div v-if="song0Warning || song1Warning" class="row">
            <div class="col-12 col-lg-8 offset-lg-2">
                <div class="row">
                    Warning - You may have selected a song that was submitted in a previous round:
                    <ul>
                        <li v-for="song in [...(song0Warning || []), ...(song1Warning || [])]" :key="song.id">
                            {{ decodeHtmlEntities(song.title) }} - {{ decodeHtmlEntities(song.artist) }} submitted by {{ decodeHtmlEntities(song.submittedBy) }} for <a :href="`https://app.musicleague.com/l/${song.leagueId}/${song.roundId}/-/results`" target="_blank">{{ decodeHtmlEntities(song.roundName) }}</a>
                        </li>
                    </ul>                    
                </div>
            </div>
        </div>
    </Teleport>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import { decodeHtmlEntities } from "@/shared/utils";

const key = ref(0);
const selectedSongs = ref<any[]>([]);

const allSongs = ref<any[]>([]);

const song0Warning = ref<any | null>(null);
const song1Warning = ref<any | null>(null);

const loadCrawlData = async () => {
	try {
		const response = await chrome.runtime.sendMessage({ action: 'getCrawlData' })
		if (response.success && response.data) {
			allSongs.value = response.data.songs || []
		}
	} catch (error) {
		console.error('Error loading crawl data:', error)
	}
}

watch([allSongs, selectedSongs], () => {
    console.log(allSongs.value, selectedSongs.value);
    if( selectedSongs.value[0] ) {
        const song0 = allSongs.value.filter(song => song.title === selectedSongs.value[0].track && song.artist === selectedSongs.value[0].artist);
        console.log(song0);
        if( song0.length > 0 ) {
            song0Warning.value = song0;
        }else{
            song0Warning.value = null;
        }
        if( selectedSongs.value[1] ) {
            const song1 = allSongs.value.filter(song => song.title === selectedSongs.value[1].track && song.artist === selectedSongs.value[1].artist);
            if( song1.length > 0 ) {
                song1Warning.value = song1;
            }else{
                song1Warning.value = null;
            }
        }
    }
});


onMounted(async () => {
    await loadCrawlData();
});

function parseSong(el: Element | null) {
    if (!el) return null;
    return {
        track: el.querySelector("h6")?.textContent || "",
        artist: el.querySelector("h6 + span")?.textContent || "",
        album: el.querySelector("h6 + span + span")?.textContent || "",
    };
}

const observer = new MutationObserver(() => {
    const song0 = parseSong(document.querySelector("#chosen-song-0"));
    const song1 = parseSong(document.querySelector("#chosen-song-1"));
    console.log(song0, song1);
    
    // Only update key if we actually found the target element
    if (song0 && song1) {
        if( selectedSongs.value[0]?.track === song0.track && selectedSongs.value[1]?.track === song1.track ) {
            return;
        }
        selectedSongs.value = [
            { track: song0.track, artist: song0.artist, album: song0.album },
            { track: song1.track, artist: song1.artist, album: song1.album },
        ];
        key.value++;
    }
});

const target = document.querySelector(".container[x-data]") as Element;
if (target) {
    observer.observe(target, {
        childList: true,
        subtree: true,
    });
}

onUnmounted(() => {
    observer.disconnect();
});
</script>