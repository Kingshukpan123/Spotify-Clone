

let currentSong = new Audio();
let songs = [];
let currFolder = ""; // will be like 'songs/Saiyaara'

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
    // folder is expected to be the folder name inside `songs`, e.g. 'Saiyaara'
    currFolder = `songs/${folder}`;

    // Read manifest (index.json) to get the list of tracks for this album
    try {
        const idxResp = await fetch(`songs/index.json`);
        if (!idxResp.ok) throw new Error('songs/index.json not found');
        const idx = await idxResp.json();
        const album = idx.albums.find(a => a.folder === folder);
        if (!album) throw new Error(`Album '${folder}' not listed in songs/index.json`);
        songs = album.tracks.slice();
    } catch (err) {
        console.error('Could not load songs index:', err.message);
        songs = [];
    }

    // show all the songs in the playlist
    let songUL = document.querySelector(".songlist").getElementsByTagName("ul")[0]
    songUL.innerHTML = ""
    for (const song of songs) {
        songUL.innerHTML += `<li><img class="invert" src="img/music.svg" alt="">
                            <div class="info">
                                <div>${song.replaceAll("%20", " ")}</div>
                                <div>dj</div>
                            </div>
                            <div class="playnow">
                                <span>
                                    Play Now
                                </span>
                                <img class ="invert" src="img/play.svg" alt="">
                            </div> </li>`;
    }

    // Attach an event listener to each song
    Array.from(document.querySelector(".songlist").getElementsByTagName("li")).forEach(e => {
        e.addEventListener("click", () => {
            const title = e.querySelector(".info").firstElementChild.innerHTML.trim();
            playMusic(title);
        })
    })

    return songs;


}

const playMusic = (track, pause = false) => {
    if (!currFolder) {
        console.warn('No folder selected');
        return;
    }

    // Use relative path so it works on static hosts and GitHub Pages
    currentSong.src = `${currFolder}/` + encodeURI(track)
    if (!pause) {
        currentSong.play()
        play.src = "img/pause.svg"
    }
    document.querySelector(".songinfo").innerHTML = track
    document.querySelector(".songtime").innerHTML = "00:00 / 00:00"
    // audio.play()
}

async function displayAlbum(){
    console.log("displaying albums")
    let cardContainer = document.querySelector(".cardContainer")
    cardContainer.innerHTML = ""

    // Load manifest that lists albums and tracks
    try {
        const resp = await fetch('songs/index.json');
        if (!resp.ok) throw new Error('songs/index.json not found');
        const idx = await resp.json();
        for (const album of idx.albums) {
            const folder = album.folder;
            try {
                const infoResp = await fetch(`songs/${folder}/info.json`);
                if (!infoResp.ok) throw new Error('info.json not found');
                const info = await infoResp.json();
                cardContainer.innerHTML += `<div data-folder = "${folder}" class="card">
                        <div class="play">...</div>
                        <img src="songs/${folder}/cover.jpeg" alt="">
                        <h2>${info.title}</h2>
                        <p>${info.description}</p>
                    </div>`
            } catch (err) {
                console.warn(`Could not load info.json for folder '${folder}':`, err.message);
            }
        }
    } catch (err) {
        console.error('Could not load songs manifest:', err.message);
    }
    //Load the playlist whenever card is clicked
    Array.from(document.getElementsByClassName("card")).forEach(e => {
        e.addEventListener("click", async item => {
            const folder = item.currentTarget.dataset.folder;
            songs = await getSongs(folder);
            if (songs.length) playMusic(songs[0]);
        })
    })


}


async function main() {

    // Display all the albums on the page
    await displayAlbum()

    // Try to load the first album from the manifest so something is ready to play
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
        console.warn('Could not preload first album:', err.message);
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