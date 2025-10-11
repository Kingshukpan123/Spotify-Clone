

let currentSong = new Audio();
let songs = [];
let currFolder = "";

// simple debug panel on page to show fetch status and manifest
function debug(msg) {
    let d = document.getElementById('debug-panel');
    if (!d) {
        d = document.createElement('div');
        d.id = 'debug-panel';
        d.style.position = 'fixed';
        d.style.right = '10px';
        d.style.bottom = '10px';
        d.style.background = 'rgba(0,0,0,0.7)';
        d.style.color = '#fff';
        d.style.padding = '8px';
        d.style.fontSize = '12px';
        d.style.maxWidth = '320px';
        d.style.zIndex = 9999;
        d.style.borderRadius = '6px';
        d.style.fontFamily = 'Arial, sans-serif';
        document.body.appendChild(d);
    }
    const p = document.createElement('div');
    p.textContent = msg;
    d.appendChild(p);
}

function secondsToMinutesSeconds(seconds) {
    if (isNaN(seconds) || seconds < 0) {
        return "00:00";
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(remainingSeconds).padStart(2, '0');

    return `${formattedMinutes}:${formattedSeconds}`;
}

async function getSongs(folder) {
    // folder expected as folder name inside songs (e.g., 'Saiyaara')
    currFolder = `songs/${folder}`;
    debug(`getSongs: loading album '${folder}'`);

    // Load manifest and find album tracks
    try {
        const m = await fetch('songs/index.json');
        if (!m.ok) throw new Error('manifest fetch failed: ' + m.status);
        const manifest = await m.json();
        const album = manifest.albums.find(a => a.folder === folder);
        if (!album) throw new Error('album not found in manifest');
        songs = album.tracks.slice();
        debug(`getSongs: found ${songs.length} tracks`);
    } catch (err) {
        console.error(err);
        debug('getSongs error: ' + err.message);
        songs = [];
    }

    // render playlist
    const songUL = document.querySelector('.songlist ul');
    songUL.innerHTML = '';
    for (const song of songs) {
        const li = document.createElement('li');
        li.innerHTML = `<img class="invert" src="img/music.svg" alt="">
            <div class="info"><div>${decodeURIComponent(song)}</div><div>dj</div></div>
            <div class="playnow"><span>Play Now</span><img class="invert" src="img/play.svg" alt=""></div>`;
        songUL.appendChild(li);
    }

    Array.from(songUL.getElementsByTagName('li')).forEach(e => {
        e.addEventListener('click', () => {
            const title = e.querySelector('.info div').textContent.trim();
            playMusic(title);
        })
    })

    return songs;
}

const playMusic = (track, pause = false) => {
    if (!currFolder) {
        debug('playMusic: no folder selected');
        return;
    }
    const url = `${currFolder}/` + encodeURI(track);
    currentSong.src = url;
    debug('playMusic: src=' + url);
    if (!pause) {
        const p = currentSong.play();
        if (p && p.catch) p.catch(err => debug('play blocked: ' + err.message));
        const playBtn = document.getElementById('play');
        if (playBtn) playBtn.src = 'img/pause.svg';
    }
    document.querySelector('.songinfo').innerHTML = track;
    document.querySelector('.songtime').innerHTML = '00:00 / 00:00';
}

async function displayAlbum(){
    console.log('displaying albums')
    const cardContainer = document.querySelector('.cardContainer');
    cardContainer.innerHTML = '';

    try {
        const resp = await fetch('songs/index.json');
        if (!resp.ok) throw new Error('manifest fetch failed: ' + resp.status);
        const manifest = await resp.json();
        for (const album of manifest.albums) {
            try {
                const infoResp = await fetch(`songs/${album.folder}/info.json`);
                if (!infoResp.ok) throw new Error('info.json not found');
                const info = await infoResp.json();
                const card = document.createElement('div');
                card.className = 'card';
                card.dataset.folder = album.folder;
                card.innerHTML = `<div class="play">...</div><img src="songs/${album.folder}/cover.jpeg" alt=""><h2>${info.title}</h2><p>${info.description}</p>`;
                cardContainer.appendChild(card);
            } catch (err) {
                console.warn(`Could not load info.json for folder '${album.folder}':`, err.message);
            }
        }
    } catch (err) {
        console.error('displayAlbum error:', err.message);
        debug('displayAlbum error: ' + err.message);
    }

    // attach click handlers
    Array.from(document.getElementsByClassName('card')).forEach(e => {
        e.addEventListener('click', async item => {
            const folder = item.currentTarget.dataset.folder;
            await getSongs(folder);
            if (songs.length) playMusic(songs[0]);
        })
    });


}


async function main() {

    document.addEventListener('DOMContentLoaded', () => debug('DOMContentLoaded'));

    await displayAlbum();

    // preload first album from manifest if available
    try {
        const resp = await fetch('songs/index.json');
        if (resp.ok) {
            const idx = await resp.json();
            if (idx.albums && idx.albums.length) {
                const first = idx.albums[0].folder;
                await getSongs(first);
                if (songs.length) playMusic(songs[0], true);
            }
        }
    } catch (err) {
        debug('preload error: ' + err.message);
    }



    //Attach an event listener to play,next ,previous
    play.addEventListener("click", () => {
        if (currentSong.paused) {
            currentSong.play()
            play.src = "img/pause.svg"
        }
        else {
            currentSong.pause()
            play.src = "img/play.svg"
        }
    })

    //Listen for time update event
    currentSong.addEventListener("timeupdate", () => {
        console.log(currentSong.currentTime, currentSong.duration);
        document.querySelector(".songtime").innerHTML = `${secondsToMinutesSeconds(currentSong.currentTime)} / ${secondsToMinutesSeconds(currentSong.duration)}`
        document.querySelector(".circle").style.left = (currentSong.currentTime / currentSong.duration) * 100 + "%";
    })

    // Add an event listener to seekbar
    document.querySelector(".seekbar").addEventListener("click", e => {
        let percent = (e.offsetX / e.target.getBoundingClientRect().width) * 100;

        document.querySelector(".circle").style.left = percent + "%";
        currentSong.currentTime = ((currentSong.duration) * percent) / 100

    })

    //Add an event listener for hamburger
    document.querySelector(".hamburger").addEventListener("click", () => {
        document.querySelector(".left").style.left = "0"
    })

    //Add an event listener for close button
    document.querySelector(".close").addEventListener("click", () => {
        document.querySelector(".left").style.left = "-120%"
    })

    //Add an event listener for previous and next
    previous.addEventListener("click", () => {
        console.log("Previous clicked")
        let index = songs.indexOf(currentSong.src.split("/").slice(-1)[0])
        if ((index - 1) >= 0) {
            playMusic(songs[index - 1])
        }
    })

    next.addEventListener("click", () => {
        currentSong.pause()
        console.log("Next clicked")

        let index = songs.indexOf(currentSong.src.split("/").slice(-1)[0])
        if ((index + 1) < songs.length) {
            playMusic(songs[index + 1])
        }


    })


    //Add an event to volume
    document.querySelector(".range").getElementsByTagName("input")[0].addEventListener("change", (e) => {
        console.log("Setting Volume to", e.target.value, "/100")
        currentSong.volume = parseInt(e.target.value) / 100
        if (currentSong.volume>0){
            document.querySelector(".volume>img").src = document.querySelector(".volume>img").src.replace("mute.svg" , "volume.svg")      
        }
    })

    //Add an event listener to mute
    document.querySelector(".volume>img").addEventListener("click",e=>{
        if(e.target.src.includes("volume.svg")){
            e.target.src = e.target.src.replace("volume.svg","mute.svg")
            currentSong.volume = 0;
            document.querySelector(".range").getElementsByTagName("input")[0].value = 0;
        }
        else{
            e.target.src = e.target.src.replace("mute.svg" , "volume.svg")
            currentSong.volume = .10;
            document.querySelector(".range").getElementsByTagName("input")[0].value = 10;
        }
    })



}



main()