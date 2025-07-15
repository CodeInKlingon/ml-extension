// Background service worker for Music League Companion extension

interface Song {
  id: string;
  title: string;
  artist: string;
  submittedBy: string;
  roundId: string;
  roundName: string;
  leagueId: string;
  leagueName: string;
  url: string;
}

interface League {
  id: string;
  name: string;
  rounds: Round[];
}

interface Round {
  id: string;
  name: string;
  songs: Song[];
}

interface CrawlData {
  leagueId: string
  lastCrawled: string
  crawledRoundIds: string[]
  songs: Song[]
  rounds: Round[]
}

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Music League Companion extension installed:', details.reason)
  
  // Set up default storage values
  chrome.storage.local.set({
    settings: {
      autoDetectLeagues: true,
      showNotifications: true,
      theme: 'dark',
      autoCrawl: true
    },
    leagues: [],
    songs: [],
    lastSync: null
  })
})

// Add crawl functionality
let isCancelled = false
let currentCrawlPromise: Promise<any> | null = null

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message)
  
  if (message.action === 'crawlRounds') {
    // Cancel any existing crawl
    if (currentCrawlPromise) {
      isCancelled = true
    }
    
    // Start new crawl with specified mode
    isCancelled = false
    currentCrawlPromise = crawlRounds(message.mode || 'all', message.roundId)
      .then(result => {
        currentCrawlPromise = null
        return result
      })
      .catch(error => {
        currentCrawlPromise = null
        throw error
      })
    
    // Return immediately with success, actual result will come via progress messages
    sendResponse({ success: true })
    return true
  }
  
  if (message.action === 'cancelCrawl') {
    isCancelled = true
    sendResponse({ success: true })
    return true
  }
  
  if (message.action === 'getCrawlData') {
    getCrawlData().then(sendResponse)
    return true
  }
  
  if (message.action === 'getRounds') {
    getRoundsList().then(sendResponse)
    return true
  }
  
  return false
})



// Parse rounds from the rounds page HTML
function parseRoundsFromHtml(html: string, leagueId: string): Round[] {
  const rounds: Round[] = []
  
  // Use regex to find round elements since DOMParser isn't available in service workers
  const roundMatches = html.match(/<div class="row mb-3 league-round-item" id="([^"]+)"[^>]*>/g)
  
  console.log(`Found ${roundMatches?.length || 0} total round elements`)
  
  if (roundMatches) {
    roundMatches.forEach((match) => {
      // Extract round ID
      const idMatch = match.match(/id="([^"]+)"/)
      const roundId = idMatch ? idMatch[1] : null
      
      if (roundId) {
        // Find the round name by looking for the card-title after this round element
        const roundStartIndex = html.indexOf(match)
        const roundEndIndex = html.indexOf('</div>', roundStartIndex)
        const roundSection = html.substring(roundStartIndex, roundEndIndex)
        
        // Look for card-title in this section
        const titleMatch = roundSection.match(/<h[56] class="card-title"[^>]*>([^<]+)<\/h[56]>/)
        const roundName = titleMatch ? titleMatch[1].trim() : 'Unknown Round'
        
        // Check if this round is completed by looking for "COMPLETE" status
        const isCompleted = roundSection.includes('status: \'COMPLETE\'')
        
        console.log(`Round ${roundName} (${roundId}): ${isCompleted ? 'COMPLETED' : 'NOT COMPLETED'}`)
        
        if (isCompleted) {
          rounds.push({
            id: roundId,
            name: roundName,
            songs: []
          })
        }
      }
    })
  }
  
  console.log(`Found ${rounds.length} completed rounds`)
  return rounds
}

// Parse songs from a round's results page HTML
function parseSongsFromHtml(html: string, round: Round, leagueId: string): Song[] {
  const songs: Song[] = []
  
  console.log(`Parsing songs for round: ${round.name}`)
  console.log(`HTML length: ${html.length} characters`)
  
  // Use regex to find song cards - each card starts with the spotify track ID
  const songCardRegex = /<div class="card mb-4" id="(spotify:track:[^"]+)"[^>]*>([\s\S]*?)<\/div>\s*<div class="card mb-4" id="spotify:track:/g
  let match
  let songCount = 0
  
  // First, let's find all the song card IDs
  const songIdMatches = html.match(/<div class="card mb-4" id="(spotify:track:[^"]+)"/g)
  console.log(`Found ${songIdMatches?.length || 0} song card IDs`)
  
  if (songIdMatches) {
    songIdMatches.forEach((idMatch, index) => {
      songCount++
      const songId = idMatch.match(/id="(spotify:track:[^"]+)"/)?.[1] || `song_${round.id}_${index}`
      
      console.log(`Processing song ${songCount}: ${songId}`)
      
      // Find the start of this song card
      const cardStart = html.indexOf(idMatch)
      if (cardStart === -1) return
      
      // Find the end of this song card by looking for the next song card or end of content
      let cardEnd = html.length
      const nextCardMatch = html.indexOf('<div class="card mb-4" id="spotify:track:', cardStart + 1)
      if (nextCardMatch !== -1) {
        cardEnd = nextCardMatch
      }
      
      const cardHtml = html.substring(cardStart, cardEnd)
      
      // Extract song title from card-title link
      const titleMatch = cardHtml.match(/<h6 class="card-title[^"]*">\s*<a[^>]*>([^<]+)<\/a>/)
      const title = titleMatch ? titleMatch[1].trim() : 'Unknown Title'
      
      // Extract artist from first card-text (the one that's not text-body-secondary)
      const cardTextMatches = cardHtml.match(/<p class="card-text m-0 text-truncate">([^<]+)<\/p>/g)
      let artist = 'Unknown Artist'
      if (cardTextMatches && cardTextMatches.length > 0) {
        // The first card-text is usually the artist
        const artistMatch = cardTextMatches[0].match(/<p class="card-text m-0 text-truncate">([^<]+)<\/p>/)
        artist = artistMatch ? artistMatch[1].trim() : 'Unknown Artist'
      }
      
      // Extract submitter from fw-semibold class in the ranking section
      const submitterMatch = cardHtml.match(/<h6[^>]*class="[^"]*fw-semibold[^"]*"[^>]*>([^<]+)<\/h6>/)
      const submittedBy = submitterMatch ? submitterMatch[1].trim() : 'Unknown User'
      
      console.log(`  Song: "${title}" by ${artist} (submitted by ${submittedBy})`)
      
      songs.push({
        id: songId,
        title,
        artist,
        submittedBy,
        roundId: round.id,
        roundName: round.name,
        leagueId,
        leagueName: 'Music League',
        url: `https://app.musicleague.com/l/${leagueId}/${round.id}/-/results`
      })
    })
  }
  
  console.log(`Total songs found for ${round.name}: ${songs.length}`)
  return songs
}

// Modified crawl function with different modes
async function crawlRounds(mode: 'all' | 'new' | 'round', roundId?: string): Promise<{ success: boolean; songs?: Song[]; error?: string }> {
  try {
    console.log(`Starting crawl with mode: ${mode}`)
    
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab.url || !tab.url.includes('app.musicleague.com')) {
      throw new Error('Not on a Music League page')
    }
    
    // Extract league ID from URL
    const leagueId = extractLeagueId(tab.url)
    if (!leagueId) {
      throw new Error('Could not extract league ID from URL')
    }
    
    console.log(`League ID: ${leagueId}`)
    
    // Get existing crawl data
    const existingData = await chrome.storage.local.get(`crawlData_${leagueId}`)
    const crawlData: CrawlData = existingData[`crawlData_${leagueId}`] || {
      leagueId,
      lastCrawled: '',
      crawledRoundIds: [],
      songs: [],
      rounds: []
    }
    
    // Get all rounds
    const roundsUrl = `https://app.musicleague.com/l/${leagueId}/-/rounds`
    console.log(`Fetching rounds from: ${roundsUrl}`)
    
    const roundsResponse = await fetch(roundsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    })
    
    if (!roundsResponse.ok) {
      throw new Error(`Failed to fetch rounds: ${roundsResponse.status}`)
    }
    
    const roundsHtml = await roundsResponse.text()
    const allRounds = parseRoundsFromHtml(roundsHtml, leagueId)
    console.log(`Found ${allRounds.length} total rounds`)
    
    if (isCancelled) {
      console.log('Crawl cancelled during rounds parsing')
      return { success: false, error: 'Crawl cancelled' }
    }
    
    // Determine which rounds to crawl based on mode
    let roundsToCrawl: Round[] = []
    
    if (mode === 'all') {
      roundsToCrawl = allRounds
      console.log(`Crawling all ${roundsToCrawl.length} rounds`)
    } else if (mode === 'new') {
      roundsToCrawl = allRounds.filter(round => !crawlData.crawledRoundIds.includes(round.id))
      console.log(`Crawling ${roundsToCrawl.length} new rounds (${crawlData.crawledRoundIds.length} already crawled)`)
    } else if (mode === 'round' && roundId) {
      const targetRound = allRounds.find(round => round.id === roundId)
      if (targetRound) {
        roundsToCrawl = [targetRound]
        console.log(`Crawling specific round: ${targetRound.name}`)
      } else {
        throw new Error(`Round ${roundId} not found`)
      }
    }
    
    if (roundsToCrawl.length === 0) {
      console.log('No rounds to crawl')
      chrome.runtime.sendMessage({ 
        action: 'crawlComplete', 
        songs: crawlData.songs,
        message: mode === 'new' ? 'No new rounds to crawl' : 'No rounds to crawl'
      })
      return { success: true, songs: crawlData.songs }
    }
    
    // Report progress
    chrome.runtime.sendMessage({ 
      action: 'crawlProgress', 
      progress: `Found ${roundsToCrawl.length} rounds to crawl` 
    })
    
    // Crawl selected rounds
    const newSongs: Song[] = []
    let processedRounds = 0
    
    for (const round of roundsToCrawl) {
      if (isCancelled) {
        console.log('Crawl cancelled during round processing')
        return { success: false, error: 'Crawl cancelled' }
      }
      
      console.log(`Crawling round: ${round.name}`)
      
      // Report progress
      processedRounds++
      chrome.runtime.sendMessage({ 
        action: 'crawlProgress', 
        progress: `Processing round ${processedRounds}/${roundsToCrawl.length}: ${round.name}` 
      })
      
      try {
        const roundSongs = await crawlRound(round, leagueId)
        newSongs.push(...roundSongs)
        console.log(`Found ${roundSongs.length} songs in round ${round.name}`)
      } catch (error) {
        console.error(`Error crawling round ${round.name}:`, error)
        // Continue with other rounds even if one fails
      }
    }
    
    if (isCancelled) {
      console.log('Crawl cancelled during song processing')
      return { success: false, error: 'Crawl cancelled' }
    }
    
    // Update crawl data
    const updatedCrawlData: CrawlData = {
      leagueId,
      lastCrawled: new Date().toISOString(),
      crawledRoundIds: [...new Set([...crawlData.crawledRoundIds, ...roundsToCrawl.map(r => r.id)])],
      songs: mode === 'round' && roundId 
        ? crawlData.songs.filter(s => s.roundId !== roundId).concat(newSongs) // Replace songs for specific round
        : [...crawlData.songs, ...newSongs], // Add new songs
      rounds: allRounds
    }
    
    // Store updated data
    await chrome.storage.local.set({ 
      [`crawlData_${leagueId}`]: updatedCrawlData,
      songs: updatedCrawlData.songs // Also update global songs for backward compatibility
    })
    
    console.log(`Total songs after crawl: ${updatedCrawlData.songs.length}`)
    
    // Report completion
    chrome.runtime.sendMessage({ 
      action: 'crawlComplete', 
      songs: updatedCrawlData.songs,
      message: `Crawled ${roundsToCrawl.length} rounds, found ${newSongs.length} new songs`
    })
    
    return { success: true, songs: updatedCrawlData.songs }
    
  } catch (error) {
    console.error('Crawl error:', error)
    
    // Report error
    chrome.runtime.sendMessage({ 
      action: 'crawlError', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Fetch and parse songs for a single round
async function crawlRound(round: Round, leagueId: string): Promise<Song[]> {
  const resultsUrl = `https://app.musicleague.com/l/${leagueId}/${round.id}/-/results`;
  console.log(`Fetching results for round: ${round.name} (${resultsUrl})`);
  
  const response = await fetch(resultsUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch results for round ${round.id}: ${response.status}`);
  }
  
  const html = await response.text();
  console.log(`Received results HTML for ${round.name} (${html.length} characters)`);
  
  return parseSongsFromHtml(html, round, leagueId);
}

// Get stored crawl data for current league
async function getCrawlData(): Promise<{ success: boolean; data?: CrawlData; error?: string }> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab.url || !tab.url.includes('app.musicleague.com')) {
      throw new Error('Not on a Music League page')
    }
    
    const leagueId = extractLeagueId(tab.url)
    if (!leagueId) {
      throw new Error('Could not extract league ID from URL')
    }
    
    const result = await chrome.storage.local.get(`crawlData_${leagueId}`)
    return { success: true, data: result[`crawlData_${leagueId}`] }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Get list of all rounds for current league
async function getRoundsList(): Promise<{ success: boolean; rounds?: Round[]; error?: string }> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab.url || !tab.url.includes('app.musicleague.com')) {
      throw new Error('Not on a Music League page')
    }
    
    const leagueId = extractLeagueId(tab.url)
    if (!leagueId) {
      throw new Error('Could not extract league ID from URL')
    }
    
    const roundsUrl = `https://app.musicleague.com/l/${leagueId}/-/rounds`
    const roundsResponse = await fetch(roundsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    })
    
    if (!roundsResponse.ok) {
      throw new Error(`Failed to fetch rounds: ${roundsResponse.status}`)
    }
    
    const roundsHtml = await roundsResponse.text()
    const rounds = parseRoundsFromHtml(roundsHtml, leagueId)
    
    return { success: true, rounds }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Extract league ID from Music League URL
function extractLeagueId(url: string): string | null {
  const match = url.match(/\/l\/([a-f0-9]+)/)
  return match ? match[1] : null
}