const express = require('express');
const app = express();
const path = require('path')
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const axios = require('axios');
const { MeiliSearch } = require('meilisearch');
const { query } = require('express');
const Zoro = require(path.resolve('./zoro-to-api'));

const client = new MeiliSearch({
    host: 'https://search.rezi.one/',
    apiKey: 'e2a1974678b37386fef69bb3638a1fb36263b78a8be244c04795ada0fa250d3d',
})

// client.index('rezi').search('sonic').then(function (response) {
//     console.log(response)
// })

// axios.post('https://search.rezi.one/indexes/rezi/search', {
//     q: query,
//     limit: 20
// }, {
//     headers: {
//         Authorization: 'Bearer e2a1974678b37386fef69bb3638a1fb36263b78a8be244c04795ada0fa250d3d',
//         'Content-Type': 'application/json',
//         Accept: 'application/json'
//     }
// })
//     .then(function (response) {
//         console.log(response);
//         socket.emit('search-results', response.data.hits);
//     })
//     .catch(function (error) {
//         console.log(error);
//         socket.emit('search-results', { error: error.message });
//     });

app.use(express.static(__dirname + '/public'));
app.use('/anim', express.static(__dirname + '/public2'));

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('search', (query) => {
        console.log('searching for:', query);

        axios.get(`https://uhdmovies.vip/?s=${encodeURIComponent(query).replace('%20', '+')}`, {
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            }
        })
            .then(function (response) {
                //console.log(response.data);
                let data = response.data
                data = data.split('\n')
                //console.log(data)
                data.forEach((element) => {
                    console.log(element)
                })
                let results = data.filter(function (element) {
                    //returning false will remove the element
                    //if (element.startsWith('<a href="vlc:' || '<a href="https:')) {
                    if (element.includes('https://uhdmovies.vip/download')) {
                        return true
                    } else {
                        return false
                    }
                })
                console.log(results)
                socket.emit('search-results', results);
            })
            .catch(function (error) {
                socket.emit('search-results', { error: error.message })
            });
    });

    socket.on('subsearch', (query) => {
        console.log('searching for links');
        console.log(query)

        axios.get(query, {
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            }
        })
            .then(function (response) {
                //console.log(response.data);
                let data = response.data
                data = data.replace('<p style="text-align: center;">', '')
                data = data.split('\n')
                data.forEach((element) => {
                    console.log(element)
                })
                let results = data.filter(function (element) {
                    //returning false will remove the element
                    //if (element.startsWith('<a href="vlc:' || '<a href="https:')) {
                    if (element.includes('https://techmny.com') && element.includes('Zip / Pack' || 'G-Drive')) {
                        return true
                    } else {
                        return false
                    }
                })
                console.log(results)
                socket.emit('subsearchresults', results)
            })
            .catch(function (error) {
                console.log(error);
            });
    })

    socket.on('animsearch', async (query) => {

        let zoroResults = await Zoro.zoroSearch("query")
        let firstResult = zoroResults[0]
        let info = Zoro.getAnimeInfoByName(firstResult.eng_title); 
        let { episodes } = await Zoro.getEpList(firstResult.id);

        let results = JSON.parse(```
        {
            'Title': ${firstResult.eng_title},
            'Banner': ${info.source}
            'Episodes': ${episodes},
        }
        ```)

        //console.log(results)
        socket.emit('animsearchresults', results)
    })

    socket.on('animplay', async (anid, epi, serv, subdub) => {
        let { episodes } = await Zoro.getEpList(anid);
        let servers = await Zoro.getEpisodeServers(episodes[epi])
        let iframedata = await Zoro.getStreamsById(servers[`servers${subdub}`][0][serv]); // Getting the iframe embed URL
        console.log(iframedata.link); // Logging the iframe embed URL
    })
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});