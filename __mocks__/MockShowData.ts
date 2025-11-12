import { Show } from '../types/RecentlyPlayed';

export const mockShowPosttentious = `<?xml version="1.0" encoding="UTF-8"?>
<wmbr_dynamic version="1.0">

    <wmbr_info>Tue  9:45 PM : now playing: &amp;nbsp;&lt;b&gt;Post-tentious&lt;/b&gt;&lt;br&gt;mostly cloudy, 62°F
    </wmbr_info>

    <wmbr_show>&lt;b&gt;Post-tentious&lt;/b&gt;

    &lt;div style=&quot;margin-bottom: 4px&quot;&gt;&lt;br&gt;with Eda Lozada&lt;/div&gt;

    post music for post people. we will regularly play post-punk, post-rock, post-hardcore, hardcore punk, art/avant garde punk, no wave, math rock, noise rock, midwest emo, shoegaze, and experimental hip hop.
    </wmbr_show>

    <wmbr_twitter></wmbr_twitter>

    <wmbr_plays>&lt;p class=&quot;recent&quot;&gt;9:42p&amp;nbsp;&lt;b&gt;Panthers&lt;/b&gt;: Vandalist Committee of Public Safety&lt;/p&gt;
    &lt;p class=&quot;recent&quot;&gt;9:40p&amp;nbsp;&lt;b&gt;Pre&lt;/b&gt;: Drool&lt;/p&gt;
    &lt;p class=&quot;recent&quot;&gt;9:39p&amp;nbsp;&lt;b&gt;Floating Woods&lt;/b&gt;: Le drame d'une amité&lt;/p&gt;
    &lt;p class=&quot;recent&quot;&gt;9:35p&amp;nbsp;&lt;b&gt;Off Minor&lt;/b&gt;: In SL&lt;/p&gt;
    &lt;p class=&quot;recent&quot;&gt;9:32p&amp;nbsp;&lt;b&gt;Swing Kids&lt;/b&gt;: Disease&lt;/p&gt;
    &lt;p class=&quot;recent&quot;&gt;9:28p&amp;nbsp;&lt;b&gt;The Lazarus Plot&lt;/b&gt;: Dissolving Substance&lt;/p&gt;
    &lt;p class=&quot;recent&quot;&gt;9:21p&amp;nbsp;&lt;b&gt;Three Mile Pilot&lt;/b&gt;: Wahn&lt;/p&gt;
    &lt;p class=&quot;recent&quot;&gt;9:15p&amp;nbsp;&lt;b&gt;Bark Psychosis&lt;/b&gt;: From What Is Said to When It's Read&lt;/p&gt;
    &lt;a href=&quot;https://track-blaster.com/wmbr/playlist.php?date=latest&quot; target=&quot;_blank&quot;&gt;full playlist&lt;/a&gt;
    </wmbr_plays>

    <wmbr_upcoming>&lt;div class=&quot;upcoming&quot;&gt;
    &lt;span class=&quot;upcoming&quot;&gt;&lt;b&gt;10:00p:&lt;/b&gt;&lt;/span&gt;&lt;a href=&quot;/cgi-bin/show?id=8772&quot;&gt;Pipeline!&lt;/a&gt; 
    &lt;/div&gt;
    &lt;div class=&quot;upcoming&quot;&gt;
    &lt;span class=&quot;upcoming&quot;&gt;&lt;b&gt;11:00p:&lt;/b&gt;&lt;/span&gt;&lt;a href=&quot;/cgi-bin/show?eid=33298&quot;&gt;Sound Principles (rebroadcast)&lt;/a&gt; 
    &lt;/div&gt;
    &lt;div class=&quot;upcoming&quot;&gt;
    &lt;span class=&quot;upcoming&quot;&gt;&lt;b&gt;12:00m:&lt;/b&gt;&lt;/span&gt;&lt;a href=&quot;/cgi-bin/show?eid=33300&quot;&gt;Late Risers' Club (rebroadcast)&lt;/a&gt; 
    &lt;/div&gt;
    &lt;div class=&quot;upcoming&quot;&gt;
    &lt;span class=&quot;upcoming&quot;&gt;&lt;b&gt;2:00a:&lt;/b&gt;&lt;/span&gt;&lt;a href=&quot;/cgi-bin/show?eid=33302&quot;&gt;For Your Pleasure (rebroadcast)&lt;/a&gt; 
    &lt;/div&gt;
    &lt;div class=&quot;upcoming&quot;&gt;
    &lt;span class=&quot;upcoming&quot;&gt;&lt;b&gt;4:00a:&lt;/b&gt;&lt;/span&gt;&lt;a href=&quot;/cgi-bin/show?eid=33304&quot;&gt;Lost and Found (rebroadcast)&lt;/a&gt; 
    &lt;/div&gt;
    &lt;div class=&quot;upcoming&quot;&gt;
    &lt;span class=&quot;upcoming&quot;&gt;&lt;b&gt;6:00a:&lt;/b&gt;&lt;/span&gt;&lt;a href=&quot;/cgi-bin/show?id=8777&quot;&gt;French Toast&lt;/a&gt; hosted by Brian Thompson
    &lt;/div&gt;
    </wmbr_upcoming>

</wmbr_dynamic>`;

// Mock show data with archives for testing navigation to ShowDetails
export const mockShowWithArchives: Show = {
  id: '1003',
  name: 'Post-tentious',
  day: 2,
  day_str: 'Tuesday',
  time: 1290,
  time_str: '9:30p',
  length: 90,
  hosts: 'Eda Lozada',
  alternates: 0,
  archives: [
    {
      url: 'https://example.com/archive1.mp3',
      date: '2024-11-05',
      size: '65MB'
    },
    {
      url: 'https://example.com/archive2.mp3',
      date: '2024-10-29',
      size: '72MB'
    }
  ]
};
