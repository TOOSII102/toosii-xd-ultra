const { keithGet } = require('../../lib/keithapi');
const { getBotName } = require('../../lib/botname');

// ── Helpers ────────────────────────────────────────────────────────────────

function trunc(s, n = 70) {
    if (!s) return 'N/A';
    return String(s).length > n ? String(s).substring(0, n) + '…' : String(s);
}

function pad(s, n) { return String(s || '').padEnd(n).substring(0, n); }

function fmtDate(d) {
    if (!d) return 'N/A';
    try { return new Date(d).toDateString(); } catch { return String(d); }
}

function fmtDateTime(d) {
    if (!d) return 'N/A';
    try {
        const dt = new Date(d);
        return dt.toDateString() + ' ' + dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch { return String(d); }
}

function box(title, icon, lines) {
    const name = getBotName();
    return `╔═|〔  ${icon} ${title} 〕\n║\n` + lines.filter(Boolean).join('\n') + `\n║\n╚═|〔 ${name} 〕`;
}

function err(title, icon, reason) {
    const name = getBotName();
    return `╔═|〔  ${icon} ${title} 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${reason}\n║\n╚═|〔 ${name} 〕`;
}

// ── League resolver ────────────────────────────────────────────────────────

const LEAGUES = {
    epl:        { slug: 'epl',        label: 'Premier League 🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
    pl:         { slug: 'epl',        label: 'Premier League 🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
    premier:    { slug: 'epl',        label: 'Premier League 🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
    laliga:     { slug: 'laliga',     label: 'La Liga 🇪🇸' },
    liga:       { slug: 'laliga',     label: 'La Liga 🇪🇸' },
    la:         { slug: 'laliga',     label: 'La Liga 🇪🇸' },
    bundesliga: { slug: 'bundesliga', label: 'Bundesliga 🇩🇪' },
    bund:       { slug: 'bundesliga', label: 'Bundesliga 🇩🇪' },
    bl:         { slug: 'bundesliga', label: 'Bundesliga 🇩🇪' },
    seriea:     { slug: 'seriea',     label: 'Serie A 🇮🇹' },
    serie:      { slug: 'seriea',     label: 'Serie A 🇮🇹' },
    italy:      { slug: 'seriea',     label: 'Serie A 🇮🇹' },
    ligue1:     { slug: 'ligue1',     label: 'Ligue 1 🇫🇷' },
    ligue:      { slug: 'ligue1',     label: 'Ligue 1 🇫🇷' },
    france:     { slug: 'ligue1',     label: 'Ligue 1 🇫🇷' },
    ucl:        { slug: 'ucl',        label: 'Champions League 🏆' },
    champions:  { slug: 'ucl',        label: 'Champions League 🏆' },
    cl:         { slug: 'ucl',        label: 'Champions League 🏆' },
    euros:      { slug: 'euros',      label: 'UEFA Euros 🌍' },
    euro:       { slug: 'euros',      label: 'UEFA Euros 🌍' },
    fifa:       { slug: 'fifa',       label: 'FIFA World Cup 🌎' },
    worldcup:   { slug: 'fifa',       label: 'FIFA World Cup 🌎' },
    wc:         { slug: 'fifa',       label: 'FIFA World Cup 🌎' },
};

function resolveLeague(arg) {
    const key = (arg || 'epl').toLowerCase().replace(/[-_ ]/g, '');
    return LEAGUES[key] || { slug: 'epl', label: 'Premier League 🏴󠁧󠁢󠁥󠁮󠁧󠁿' };
}

const LEAGUE_HINT = '💡 Leagues: epl | laliga | bundesliga | seriea | ligue1 | ucl | euros | fifa';

// ── Commands ───────────────────────────────────────────────────────────────

// .playersearch <name>
const playerSearchCmd = {
    name: 'playersearch',
    aliases: ['player', 'findplayer', 'playerinfo', 'pinfo'],
    description: 'Search for a sports player — .playersearch <name>',
    category: 'sports',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const query = args.join(' ').trim();
        if (!query) return sock.sendMessage(chatId, {
            text: err('PLAYER SEARCH', '⚽', `Usage: ${prefix}playersearch <player name>`)
        }, { quoted: msg });

        try {
            await sock.sendMessage(chatId, { react: { text: '⚽', key: msg.key } });
            const data = await keithGet('/sport/playersearch', { q: query });
            const results = data.result || data;
            if (!Array.isArray(results) || !results.length) throw new Error('No players found');

            const top = results.slice(0, 5);
            const list = top.map((p, i) => [
                `║ ▸ [${i + 1}] *${p.name}*  (${p.team || 'N/A'})`,
                `║      🏅 ${p.position || 'N/A'} | 🌍 ${p.nationality || 'N/A'} | 🎂 ${fmtDate(p.birthDate)}`,
                `║      🏆 ${p.sport || 'Soccer'} | Status: ${p.status || 'N/A'}`,
            ].join('\n')).join('\n║\n');

            await sock.sendMessage(chatId, {
                text: box(`PLAYER SEARCH · ${query}`, '⚽', [list])
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, { text: err('PLAYER SEARCH', '⚽', e.message) }, { quoted: msg });
        }
    }
};

// .teamsearch <name>
const teamSearchCmd = {
    name: 'teamsearch',
    aliases: ['team', 'findteam', 'clubinfo', 'club'],
    description: 'Search for a sports team/club — .teamsearch <name>',
    category: 'sports',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const query = args.join(' ').trim();
        if (!query) return sock.sendMessage(chatId, {
            text: err('TEAM SEARCH', '🛡️', `Usage: ${prefix}teamsearch <team name>`)
        }, { quoted: msg });

        try {
            await sock.sendMessage(chatId, { react: { text: '🛡️', key: msg.key } });
            const data = await keithGet('/sport/teamsearch', { q: query });
            const results = data.result || data;
            if (!Array.isArray(results) || !results.length) throw new Error('No teams found');

            const t = results[0]; // show top match in detail
            const others = results.slice(1, 4).map(x => x.name).join(', ');
            await sock.sendMessage(chatId, {
                text: box(`TEAM INFO · ${t.name}`, '🛡️', [
                    `║ ▸ *Name*      : ${t.name}`,
                    `║ ▸ *Short*     : ${t.shortName || t.alternateName || 'N/A'}`,
                    `║ ▸ *Sport*     : ${t.sport || 'Soccer'}`,
                    `║ ▸ *League*    : ${t.league || 'N/A'}`,
                    `║ ▸ *Country*   : ${t.country || 'N/A'}`,
                    `║ ▸ *Location*  : ${t.location || 'N/A'}`,
                    `║ ▸ *Stadium*   : ${t.stadium || 'N/A'} (${t.stadiumCapacity ? t.stadiumCapacity.toLocaleString() + ' cap' : 'N/A'})`,
                    `║ ▸ *Founded*   : ${t.formedYear || 'N/A'}`,
                    `║ ▸ *Colors*    : ${t.colors || 'N/A'}`,
                    `║ ▸ *About*     : ${trunc(t.description, 100)}`,
                    others ? `║\n║ 🔍 Also found: ${others}` : null,
                ])
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, { text: err('TEAM SEARCH', '🛡️', e.message) }, { quoted: msg });
        }
    }
};

// .venuesearch <name>
const venueSearchCmd = {
    name: 'venuesearch',
    aliases: ['venue', 'stadium', 'findvenue', 'arena'],
    description: 'Search for a sports venue/stadium — .venuesearch <name>',
    category: 'sports',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const query = args.join(' ').trim();
        if (!query) return sock.sendMessage(chatId, {
            text: err('VENUE SEARCH', '🏟️', `Usage: ${prefix}venuesearch <stadium name>`)
        }, { quoted: msg });

        try {
            await sock.sendMessage(chatId, { react: { text: '🏟️', key: msg.key } });
            const data = await keithGet('/sport/venuesearch', { q: query });
            const results = data.result || data;
            if (!Array.isArray(results) || !results.length) throw new Error('No venues found');

            const top = results.slice(0, 4);
            const list = top.map((v, i) => [
                `║ ▸ [${i + 1}] *${v.name}*`,
                `║      📍 ${v.location || 'N/A'}, ${v.country || 'N/A'}`,
                `║      👥 Capacity: ${v.capacity ? Number(v.capacity).toLocaleString() : 'N/A'} | 🏆 ${v.sport || 'N/A'}`,
                v.description ? `║      ${trunc(v.description, 60)}` : null,
            ].filter(Boolean).join('\n')).join('\n║\n');

            await sock.sendMessage(chatId, {
                text: box(`VENUE SEARCH · ${query}`, '🏟️', [list])
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, { text: err('VENUE SEARCH', '🏟️', e.message) }, { quoted: msg });
        }
    }
};

// .h2h <team1> vs <team2>
const gameEventsCmd = {
    name: 'h2h',
    aliases: ['gameevents', 'matchhistory', 'headtohead', 'versus'],
    description: 'Head-to-head match history — .h2h <Team A> vs <Team B>',
    category: 'sports',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const query = args.join(' ').trim();
        if (!query || !query.toLowerCase().includes('vs')) return sock.sendMessage(chatId, {
            text: err('HEAD-TO-HEAD', '⚔️', `Usage: ${prefix}h2h <Team A> vs <Team B>`)
        }, { quoted: msg });

        try {
            await sock.sendMessage(chatId, { react: { text: '⚔️', key: msg.key } });
            const data = await keithGet('/sport/gameevents', { q: query });
            const results = data.result || data;
            if (!Array.isArray(results) || !results.length) throw new Error('No match history found');

            const sorted = results.slice(0, 8);
            const list = sorted.map((m, i) => {
                const date = m.dateTime ? fmtDateTime(m.dateTime) : fmtDate(m.date);
                const venue = m.venue?.name || 'N/A';
                const status = m.status || 'N/A';
                const score = m.score || m.result || '';
                return [
                    `║ ▸ [${i + 1}] *${m.match || m.alternateMatchName || query}*`,
                    `║      📅 ${date} | Status: ${status}`,
                    `║      🏟️ ${venue}`,
                    m.league?.name ? `║      🏆 ${m.league.name} — Season ${m.season || 'N/A'}` : null,
                    score ? `║      📊 Score: ${score}` : null,
                ].filter(Boolean).join('\n');
            }).join('\n║\n');

            await sock.sendMessage(chatId, {
                text: box(`H2H · ${query}`, '⚔️', [
                    `║ 📊 *${results.length} matches found* (showing ${sorted.length})`,
                    '║',
                    list,
                ])
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, { text: err('HEAD-TO-HEAD', '⚔️', e.message) }, { quoted: msg });
        }
    }
};

// .livescore
const liveScoreCmd = {
    name: 'livescore',
    aliases: ['live', 'liveresults', 'scores', 'livegames'],
    description: 'Get live football scores right now',
    category: 'sports',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        try {
            await sock.sendMessage(chatId, { react: { text: '🔴', key: msg.key } });
            const data = await keithGet('/livescore2');
            if (!data.status && !data.data) throw new Error(data.error || 'No live data');
            const rawData = data.result || data;
            const items = rawData?.data?.list || rawData?.list || [];
            if (!items.length) {
                await sock.sendMessage(chatId, {
                    text: box('LIVE SCORES', '🔴', ['║ ⚽ No live matches right now. Check back later!'])
                }, { quoted: msg });
                return;
            }

            const games = items.slice(0, 10);
            const list = games.map(g => {
                const t1 = g.team1 || {};
                const t2 = g.team2 || {};
                const s1 = t1.score ?? '?';
                const s2 = t2.score ?? '?';
                const comp = g.competition?.name || g.league || '';
                return `║ ▸ *${t1.name || '?'}* ${s1} — ${s2} *${t2.name || '?'}*${comp ? `\n║      🏆 ${comp}` : ''}`;
            }).join('\n║\n');

            await sock.sendMessage(chatId, {
                text: box(`LIVE SCORES · ${items.length} matches`, '🔴', [list])
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, { text: err('LIVE SCORES', '🔴', e.message) }, { quoted: msg });
        }
    }
};

// .standings [league]
const standingsCmd = {
    name: 'standings',
    aliases: ['table', 'leaguetable', 'pts', 'points'],
    description: 'League standings table — .standings [epl|laliga|bundesliga|seriea|ligue1|ucl|euros|fifa]',
    category: 'sports',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const { slug, label } = resolveLeague(args[0]);
        try {
            await sock.sendMessage(chatId, { react: { text: '📊', key: msg.key } });
            const data = await keithGet(`/${slug}/standings`);
            if (!data.status || !data.result?.standings?.length) throw new Error(data.error || 'No standings data');
            const { competition, standings } = data.result;
            const rows = standings.slice(0, 20);

            const header = `║ ${'#'.padEnd(3)} ${'Team'.padEnd(22)} ${'P'.padEnd(4)} ${'W'.padEnd(4)} ${'D'.padEnd(4)} ${'L'.padEnd(4)} ${'GD'.padEnd(5)} Pts`;
            const divider = `║ ${'─'.repeat(55)}`;
            const lines = rows.map(r =>
                `║ ${String(r.position).padEnd(3)} ${pad(r.team, 22)} ${String(r.played).padEnd(4)} ${String(r.won).padEnd(4)} ${String(r.draw).padEnd(4)} ${String(r.lost).padEnd(4)} ${String(r.goalDifference >= 0 ? '+' + r.goalDifference : r.goalDifference).padEnd(5)} *${r.points}*`
            );

            await sock.sendMessage(chatId, {
                text: box(`${label} STANDINGS`, '📊', [
                    `║ 🏆 *${competition}*`,
                    '║',
                    header,
                    divider,
                    ...lines,
                    '║',
                    `║ ${LEAGUE_HINT}`,
                ])
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, { text: err(`${label} STANDINGS`, '📊', e.message) }, { quoted: msg });
        }
    }
};

// .scorers [league]
const scorersCmd = {
    name: 'scorers',
    aliases: ['topscorers', 'goals', 'goldenboot', 'topgoals'],
    description: 'Top scorers leaderboard — .scorers [league]',
    category: 'sports',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const { slug, label } = resolveLeague(args[0]);
        try {
            await sock.sendMessage(chatId, { react: { text: '🥅', key: msg.key } });
            const data = await keithGet(`/${slug}/scorers`);
            if (!data.status || !data.result?.topScorers?.length) throw new Error(data.error || 'No scorer data');
            const { competition, topScorers } = data.result;
            const top = topScorers.slice(0, 15);

            const header = `║ ${'#'.padEnd(3)} ${'Player'.padEnd(22)} ${'Team'.padEnd(22)} ${'G'.padEnd(4)} ${'A'.padEnd(4)} Pen`;
            const divider = `║ ${'─'.repeat(60)}`;
            const lines = top.map(s =>
                `║ ${String(s.rank).padEnd(3)} ${pad(s.player, 22)} ${pad(s.team, 22)} *${String(s.goals).padEnd(4)}* ${String(s.assists ?? 'N/A').padEnd(4)} ${s.penalties ?? 'N/A'}`
            );

            await sock.sendMessage(chatId, {
                text: box(`${label} TOP SCORERS`, '🥅', [
                    `║ 🏆 *${competition}*`,
                    '║',
                    header,
                    divider,
                    ...lines,
                    '║',
                    `║ ${LEAGUE_HINT}`,
                ])
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, { text: err(`${label} TOP SCORERS`, '🥅', e.message) }, { quoted: msg });
        }
    }
};

// .results [league]
const resultsCmd = {
    name: 'results',
    aliases: ['matches', 'matchresults', 'fixtures', 'scores'],
    description: 'Recent match results — .results [league]',
    category: 'sports',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const { slug, label } = resolveLeague(args[0]);
        try {
            await sock.sendMessage(chatId, { react: { text: '📋', key: msg.key } });
            const data = await keithGet(`/${slug}/matches`);
            if (!data.status || !data.result?.matches?.length) throw new Error(data.error || 'No match data');
            const { competition, matches } = data.result;

            // Show last 10 finished, then any upcoming
            const finished = matches.filter(m => m.status === 'FINISHED').slice(-10);
            const displayed = finished.length ? finished : matches.slice(0, 10);

            const list = displayed.map(m =>
                `║ ▸ *${m.homeTeam}* ${m.score || '? - ?'} *${m.awayTeam}*\n║      📅 MD${m.matchday} | ${m.status}`
            ).join('\n║\n');

            await sock.sendMessage(chatId, {
                text: box(`${label} RESULTS`, '📋', [
                    `║ 🏆 *${competition}*`,
                    '║',
                    list,
                    '║',
                    `║ ${LEAGUE_HINT}`,
                ])
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, { text: err(`${label} RESULTS`, '📋', e.message) }, { quoted: msg });
        }
    }
};

// .upcoming [league]
const upcomingCmd = {
    name: 'upcoming',
    aliases: ['fixtures', 'nextmatches', 'schedule', 'nextgame'],
    description: 'Upcoming fixtures — .upcoming [league]',
    category: 'sports',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const { slug, label } = resolveLeague(args[0]);
        try {
            await sock.sendMessage(chatId, { react: { text: '📅', key: msg.key } });
            const data = await keithGet(`/${slug}/upcomingmatches`);
            if (!data.status || !data.result?.upcomingMatches?.length) throw new Error(data.error || 'No upcoming matches');
            const { competition, upcomingMatches } = data.result;
            const games = upcomingMatches.slice(0, 10);

            const list = games.map(m =>
                `║ ▸ *${m.homeTeam}* vs *${m.awayTeam}*\n║      📅 ${fmtDateTime(m.date)} | MD${m.matchday}`
            ).join('\n║\n');

            await sock.sendMessage(chatId, {
                text: box(`${label} UPCOMING FIXTURES`, '📅', [
                    `║ 🏆 *${competition}*`,
                    '║',
                    list,
                    '║',
                    `║ ${LEAGUE_HINT}`,
                ])
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, { text: err(`${label} UPCOMING FIXTURES`, '📅', e.message) }, { quoted: msg });
        }
    }
};

// .bettips
const betCmd = {
    name: 'bettips',
    aliases: ['bet', 'predictions', 'bettingodds', 'odds'],
    description: 'Football betting tips & predictions for today\'s matches',
    category: 'sports',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        try {
            await sock.sendMessage(chatId, { react: { text: '💰', key: msg.key } });
            const data = await keithGet('/bet');
            const tips = data.result || data;
            if (!Array.isArray(tips) || !tips.length) throw new Error('No tips available');

            const shown = tips.slice(0, 8);
            const list = shown.map((t, i) => {
                const p = t.predictions || {};
                const ft = p.fulltime || {};
                const over = p.over_2_5 || {};
                const btts = p.bothTeamToScore || {};
                const bestBet = ft.away >= ft.home && ft.away >= ft.draw
                    ? `Away Win (${ft.away}%)` : ft.draw >= ft.home
                    ? `Draw (${ft.draw}%)` : `Home Win (${ft.home}%)`;
                const result = t.result ? `🏁 Result: *${t.result}*` : `📌 Result: Pending`;
                return [
                    `║ ▸ [${i + 1}] *${t.match}*`,
                    `║      🏆 ${t.league} | 🕐 ${t.time?.split(' ')[1] || t.time || 'N/A'}`,
                    `║      📈 Best Bet: *${bestBet}*`,
                    over.yes != null ? `║      ⚽ Over 2.5: ${over.yes}% | BTTS: ${btts.yes ?? 'N/A'}%` : null,
                    p.value_bets ? `║      💎 Value Bets: ${p.value_bets}` : null,
                    `║      ${result}`,
                ].filter(Boolean).join('\n');
            }).join('\n║\n');

            await sock.sendMessage(chatId, {
                text: box(`BETTING TIPS · ${tips.length} matches`, '💰', [list, '║', '║ ⚠️ _Gamble responsibly. For entertainment only._'])
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, { text: err('BETTING TIPS', '💰', e.message) }, { quoted: msg });
        }
    }
};

module.exports = [
    playerSearchCmd,
    teamSearchCmd,
    venueSearchCmd,
    gameEventsCmd,
    liveScoreCmd,
    standingsCmd,
    scorersCmd,
    resultsCmd,
    upcomingCmd,
    betCmd,
];
