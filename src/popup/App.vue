<template>
	<div class="popup-container">
		<Toast />

		<!-- Main Content with Tabs -->
		<div class="content p-3">
			<Tabs v-model:value="selectedTab">
				<TabList>
					<Tab value="0">
						<i class="pi pi-download me-2"></i>
						Data Collection
					</Tab>
					<Tab value="1">
						<i class="pi pi-search me-2"></i>
						Search Songs
					</Tab>
				</TabList>
				<TabPanels>
					<!-- Data Collection Tab -->
					<TabPanel value="0">
						<Card class="mb-3">
							<template #title>
								<i class="pi pi-download me-2"></i>
								Data Collection
							</template>
							<template #content>
								<p class="text-muted mb-3">
									Crawl your Music League to collect song data for searching.
								</p>

								<!-- Crawl Statistics -->
								<div v-if="crawlData" class="mb-3 p-2 bg-light rounded">
									<table>
										<tr>
											<td>Songs</td>
											<td>{{ crawlData.songs?.length || 0 }}</td>
										</tr>
										<tr>
											<td>Rounds Crawled</td>
											<td>{{ crawlData.crawledRoundIds?.length || 0 }}</td>
										</tr>
										<tr>
											<td>Last Crawl</td>
											<td>{{ formatDate(crawlData.lastCrawled) }}</td>
										</tr>
									</table>
								</div>

								<!-- Crawl Mode Selection -->
								<div class="mb-3">
									<label class="form-label">Crawl Mode:</label>
									<Dropdown v-model="selectedCrawlMode" :options="crawlModes" optionLabel="label"
										optionValue="value" placeholder="Select crawl mode" class="w-100"
										:disabled="isCrawling" />
								</div>

								<!-- Round Selection (for individual round crawl) -->
								<div v-if="selectedCrawlMode === 'round'" class="mb-3">
									<label class="form-label">Select Round:</label>
									<Dropdown v-model="selectedRound" :options="availableRounds" optionLabel="name"
										optionValue="id" placeholder="Select a round to crawl" class="w-100"
										:disabled="isCrawling" />
								</div>

								<div v-if="uncrawledRounds.length > 0 && !isCrawling" class="alert alert-warning d-flex align-items-center mb-3">
									<i class="pi pi-exclamation-triangle me-2"></i>
									<span>
										{{ uncrawledRounds.length }} new round{{ uncrawledRounds.length > 1 ? 's have' : ' has' }} been completed but not crawled.
									</span>
									<Button
										label="Crawl New Rounds"
										icon="pi pi-refresh"
										size="small"
										class="ms-auto"
										:disabled="isCrawling"
										@click="() => { selectedCrawlMode = 'new'; startCrawl(); }"
									/>
								</div>

								<div class="d-flex gap-2">
									<Button v-if="!isCrawling" :label="getCrawlButtonLabel()"
										:icon="getCrawlButtonIcon()" @click="startCrawl"
										:disabled="!isOnMusicLeague || (selectedCrawlMode === 'round' && !selectedRound)"
										class="flex-1" />
									<Button v-else label="Cancel Crawl" icon="pi pi-times" severity="secondary"
										@click="cancelCrawl" class="flex-1" />
								</div>

								<div v-if="!isOnMusicLeague" class="mt-2">
									<small class="text-warning">
										<i class="pi pi-exclamation-triangle me-1"></i>
										Please navigate to a Music League page to crawl data
									</small>
								</div>
							</template>
						</Card>
					</TabPanel>

					<!-- Search Songs Tab -->
					<TabPanel value="1">
						<Card>
							<template #content>
								<div class="mb-3">
									<InputText v-model="searchQuery" placeholder="Search by song title or artist..."
										style="width: 100%;" :disabled="isCrawling || songs.length === 0" />
								</div>

								<div v-if="songs.length === 0 && !isCrawling" class="text-center text-muted">
									<i class="pi pi-info-circle fs-1 mb-2"></i>
									<p>No songs found. Crawl your Music League first to search through songs.</p>
								</div>

								<div v-if="songs.length > 0 && !isCrawling && filteredSongs.length === 0" class="text-center text-muted">
									<i class="pi pi-info-circle fs-1 mb-2"></i>
									<p>No songs found for that search query.</p>
								</div>

								<div v-else-if="isCrawling" class="text-center">
									<ProgressSpinner />
									<p class="mt-2 text-muted">Crawling Music League data...</p>
								</div>

								<div v-else>
									<DataTable
										:key="selectedTab"
										:value="filteredSongs"
										:virtualScrollerOptions="{ itemSize: 61.2 }"
										scrollable 
										scrollHeight="400px"
										stripedRows
										showGridlines
										responsiveLayout="scroll"
										autoLayout
										style="width: 100%;"
									>
										<Column field="title" header="Title" sortable style="width: 25%">
											<template #body="slotProps">
												<div class="song-title fw-bold">{{ decodeHtmlEntities(slotProps.data.title) }}</div>
												<div class="song-artist">{{ decodeHtmlEntities(slotProps.data.artist) }}</div>

											</template>
										</Column>
										<Column field="roundName" header="Round" sortable style="width: 20%">
											<template #body="slotProps">
												<Tag :value="decodeHtmlEntities(slotProps.data.roundName)" size="small"
													class="cursor-pointer" @click="openRound(slotProps.data)" />
											</template>
										</Column>
										<Column field="submittedBy" header="Submitted By" sortable style="width: 20%">
											<template #body="slotProps">
												<span class="text-muted">{{ decodeHtmlEntities(slotProps.data.submittedBy) }}</span>
											</template>
										</Column>
									</DataTable>
								</div>
							</template>
						</Card>
					</TabPanel>
				</TabPanels>
			</Tabs>
		</div>

		<!-- Loading Overlay -->
		<div v-if="isCrawling" class="loading-overlay">
			<div class="text-center">
				<ProgressSpinner />
				<p class="mt-2">Crawling Music League...</p>
				<small class="text-muted">This may take a few moments</small>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Card from 'primevue/card';
import Dropdown from 'primevue/dropdown';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import ProgressSpinner from 'primevue/progressspinner';
import Tag from 'primevue/tag';
import Toast from 'primevue/toast';


interface Song {
	id: string
	title: string
	artist: string
	submittedBy: string
	roundId: string
	roundName: string
	leagueId: string
	leagueName: string
	url: string
}

interface Round {
	id: string
	name: string
}

interface CrawlData {
	leagueId: string
	lastCrawled: string
	crawledRoundIds: string[]
	songs: Song[]
	rounds: Round[]
}

const toast = useToast()

// Reactive state
const songs = ref<Song[]>([])
const searchQuery = ref('')
const isCrawling = ref(false)
const crawlStatus = ref('Ready')
const isOnMusicLeague = ref(false)
const crawlData = ref<CrawlData | null>(null)
const availableRounds = ref<Round[]>([])
const selectedCrawlMode = ref('all')
const selectedRound = ref<string | null>(null)
const selectedTab = ref("0")

// Crawl mode options
const crawlModes = [
	{ label: 'Crawl All Rounds', value: 'all' },
	{ label: 'Crawl New Rounds Only', value: 'new' },
	{ label: 'Crawl Specific Round', value: 'round' }
]

// Helper function to decode HTML entities
const decodeHtmlEntities = (text: string): string => {
	const textarea = document.createElement('textarea')
	textarea.innerHTML = text
	return textarea.value
}

// Computed properties
const filteredSongs = computed(() => {
	if (!searchQuery.value.trim()) return songs.value;

	const query = searchQuery.value.toLowerCase()
	return songs.value.filter(song =>
		decodeHtmlEntities(song.title).toLowerCase().includes(query) ||
		decodeHtmlEntities(song.artist).toLowerCase().includes(query) ||
		decodeHtmlEntities(song.submittedBy).toLowerCase().includes(query) ||
		decodeHtmlEntities(song.roundName).toLowerCase().includes(query)
	)
})

const uncrawledRounds = computed(() => {
	if (!crawlData.value || !availableRounds.value.length) return []
	const crawledIds = new Set(crawlData.value.crawledRoundIds || [])
	return availableRounds.value.filter(round => !crawledIds.has(round.id))
})

// Methods
const getCrawlButtonLabel = () => {
	switch (selectedCrawlMode.value) {
		case 'all': return 'Crawl All Rounds'
		case 'new': return 'Crawl New Rounds'
		case 'round': return 'Crawl Selected Round'
		default: return 'Crawl Rounds'
	}
}

const getCrawlButtonIcon = () => {
	switch (selectedCrawlMode.value) {
		case 'all': return 'pi pi-download'
		case 'new': return 'pi pi-refresh'
		case 'round': return 'pi pi-sync'
		default: return 'pi pi-download'
	}
}

const formatDate = (dateString: string) => {
	if (!dateString) return 'Never'
	return new Date(dateString).toLocaleDateString()
}

const startCrawl = async () => {
	if (!isOnMusicLeague.value) {
		toast.add({
			severity: 'warn',
			summary: 'Cannot Crawl',
			detail: 'Please navigate to a Music League page first',
			life: 3000
		})
		return
	}

	if (selectedCrawlMode.value === 'round' && !selectedRound.value) {
		toast.add({
			severity: 'warn',
			summary: 'Select Round',
			detail: 'Please select a round to crawl',
			life: 3000
		})
		return
	}

	isCrawling.value = true
	crawlStatus.value = 'Crawling...'

	try {
		// Send message to background script to start crawling
		const response = await chrome.runtime.sendMessage({
			action: 'crawlRounds',
			mode: selectedCrawlMode.value,
			roundId: selectedRound.value
		})

		if (response.success) {
			crawlStatus.value = 'Complete'
			toast.add({
				severity: 'success',
				summary: 'Crawl Complete',
				detail: `Crawl operation started successfully`,
				life: 3000
			})
		} else {
			throw new Error(response.error || 'Unknown error')
		}
	} catch (error) {
		console.error('Crawl error:', error)
		crawlStatus.value = 'Error'
		toast.add({
			severity: 'error',
			summary: 'Crawl Failed',
			detail: error instanceof Error ? error.message : 'Unknown error occurred',
			life: 5000
		})
	} finally {
		isCrawling.value = false
	}
}

const cancelCrawl = async () => {
	try {
		await chrome.runtime.sendMessage({ action: 'cancelCrawl' })
		crawlStatus.value = 'Cancelled'
		toast.add({
			severity: 'info',
			summary: 'Crawl Cancelled',
			detail: 'The crawl operation has been cancelled',
			life: 3000
		})
	} catch (error) {
		console.error('Cancel error:', error)
	}
}

const openRound = (song: Song) => {
	chrome.tabs.create({ url: song.url.replace(/-\/results$/, '') })
}

const checkCurrentTab = async () => {
	try {
		const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
		isOnMusicLeague.value = tab.url?.includes('app.musicleague.com') || false
	} catch (error) {
		console.error('Error checking current tab:', error)
		isOnMusicLeague.value = false
	}
}

const loadCrawlData = async () => {
	try {
		const response = await chrome.runtime.sendMessage({ action: 'getCrawlData' })
		if (response.success && response.data) {
			crawlData.value = response.data
			songs.value = response.data.songs || []
			crawlStatus.value = response.data.songs?.length > 0 ? 'Complete' : 'Ready'
		}
	} catch (error) {
		console.error('Error loading crawl data:', error)
	}
}

const loadRoundsList = async () => {
	try {
		const response = await chrome.runtime.sendMessage({ action: 'getRounds' })
		if (response.success && response.rounds) {
			availableRounds.value = response.rounds
		}
	} catch (error) {
		console.error('Error loading rounds list:', error)
	}
}

// Watch for storage changes
const handleStorageChange = (changes: any) => {
	if (changes.songs) {
		songs.value = changes.songs.newValue || []
	}
}

// Lifecycle
onMounted(async () => {
	await checkCurrentTab()
	await loadCrawlData()
	await loadRoundsList()

	// Listen for storage changes
	chrome.storage.onChanged.addListener(handleStorageChange)

	// Listen for messages from background script
	chrome.runtime.onMessage.addListener((message) => {
		if (message.action === 'crawlProgress') {
			crawlStatus.value = message.progress
		} else if (message.action === 'crawlComplete') {
			isCrawling.value = false
			crawlStatus.value = 'Complete'
			songs.value = message.songs || []
			if (message.message) {
				toast.add({
					severity: 'success',
					summary: 'Crawl Complete',
					detail: message.message,
					life: 3000
				})
			}
			// Reload crawl data to update statistics
			loadCrawlData()
		} else if (message.action === 'crawlError') {
			isCrawling.value = false
			crawlStatus.value = 'Error'
			toast.add({
				severity: 'error',
				summary: 'Crawl Error',
				detail: message.error,
				life: 5000
			})
		}
	})
})

// Watch for tab changes
chrome.tabs.onActivated.addListener(checkCurrentTab)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	if (changeInfo.status === 'complete' && tab.active) {
		checkCurrentTab()
	}
})

// Watch for crawl mode changes
watch(selectedCrawlMode, (newMode) => {
	if (newMode === 'round') {
		loadRoundsList()
	}
	selectedRound.value = null
})
</script>

<style scoped>
.popup-container {
	position: relative;
	width: 700px;
	min-height: 500px;
}

:deep(.p-card-body) {
	padding: 0;
}

.text-center {
	text-align: center;
}

table td {
	padding-top: 0.5rem;
	padding-bottom: 0.5rem;
	padding-right: 0.5rem;
}

.content {
	overflow-y: auto;
}

/* Custom scrollbar */
.content::-webkit-scrollbar {
	width: 6px;
}

.content::-webkit-scrollbar-track {
	background: #f1f1f1;
}

.content::-webkit-scrollbar-thumb {
	background: var(--music-league-purple);
	border-radius: 3px;
}

.content::-webkit-scrollbar-thumb:hover {
	background: var(--music-league-purple-light);
}

.form-label {
	font-weight: 600;
	margin-bottom: 0.5rem;
	color: #495057;
}

.cursor-pointer {
	cursor: pointer;
}

/* Loading overlay */
.loading-overlay {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(255, 255, 255, 0.9);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 1000;
}

/* Song styling */
.song-title {
	font-weight: 600;
	color: var(--music-league-purple);
	margin-bottom: 4px;
}

.song-artist {
	color: #6c757d;
	font-size: 0.9em;
	margin-bottom: 2px;
}
</style>