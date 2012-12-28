// The code below uses require.js, a module system for javscript:
// http://requirejs.org/docs/api.html#define

require.config({ 
    baseUrl: 'js/lib',
    paths: {'jquery':
            ['//ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min',
             'jquery'],}
});

// Include the in-app payments API, and if it fails to load handle it
// gracefully.
// https://developer.mozilla.org/en/Apps/In-app_payments
require(['https://marketplace.cdn.mozilla.net/mozmarket.js'],
        function() {},
        function(err) {
            window.mozmarket = window.mozmarket || {};
            window.mozmarket.buy = function() {
                alert('The in-app purchasing is currently unavailable.');
            };
        });

// When you write javascript in separate files, list them as
// dependencies along with jquery
define("app", function(require) {

    var $ = require('jquery');
    require('d3');

    // If using Twitter Bootstrap, you need to require all the
    // components that you use, like so:
    // require('bootstrap/dropdown');
    // require('bootstrap/alert');


    // START HERE: Put your js code here

    var api_user = "http://mcplots-dev.cern.ch/api.php?user=";
    var id = localStorage.getItem("user.id");
    var items = ['cpu_time', 'n_events', 'n_jobs', 'n_good_jobs', 'n_hosts'];

    function reset_local_storage() {
        var i = 0;
        var l = items.length;
        var j = 0;
        for(i=0;i<l;i++) {
            for(j=0;j<7;j++) {
                localStorage.removeItem(j + "_" + items[i]);
                localStorage.removeItem(j + "_" + items[i] + "_date");
            }
        }
        localStorage.removeItem("snapshot");
        localStorage.removeItem("snapshot_head");
    }
    function get_user_stats(api_user, id) {
        return $.ajax({
            url:api_user + id,
            dataType: 'json',
        });
    }

    function update_user_stats_localstorage(data, date, firstTime) {
        //var dateStr = date.getYear() + "-" + date.getMonth() + "-" + date.getDay()+Math.random();
        var dateStr = date.getTime()/1000;  
        var snapshot = localStorage.getItem("snapshot");
        var snapshot_head = 0;
        if ( snapshot == null) {
            localStorage.setItem("snapshot",dateStr);
            localStorage.setItem("snapshot_head",0);
            firsTime = true;
        }
        if (snapshot != dateStr) {
            localStorage.setItem("snapshot", dateStr);
            snapshot_head = parseInt( localStorage.getItem("snapshot_head") );
            if (snapshot_head >= 7) {
                snapshot_head = 1;
                for (var i=1;i<7;i++) {
                var item = i + "_" + items[i];
                localStorage.removeItem(item);
                localStorage.removeItem(item + "_date");
                }
            }
            var i = 0;
            var l = items.length;
            if (firstTime) {
                for (i;i<l;i++) {
                var item = 0 + "_" + items[i];
                localStorage.setItem(item, data[items[i]]);
                localStorage.setItem(item + "_date", date.getTime()/1000);
                }
            }
            else {
                for (i=0;i<l;i++) {
                    var item = snapshot_head + "_" + items[i];
                    var initItem = "0_" + items[i];
                    var initValue = parseInt(localStorage.getItem(initItem));
                    localStorage.setItem(item, ( data[items[i]] - initValue ));
                    localStorage.setItem(item + "_date", date.getTime()/1000);
                }
            }
            snapshot_head += 1;
            localStorage.setItem("snapshot_head", snapshot_head);
        }
    }

    function update_user_stats_card(api_user, id) {
        var f = d3.format("2.3s");
        var firstTime = false;

        $("#settings").hide();
        $("#userStats").show();
        $("#loading").show();
        // Load chached data
        if (localStorage.getItem("0_cpu_time")!= null) {
            $("span#cpu_time").text(f(parseFloat(localStorage.getItem("0_cpu_time"))));
            $("span#n_events").text(f(parseFloat(localStorage.getItem("0_n_events"))));
            if (parseFloat(localStorage.getItem("0_n_events")) >= 1000000000) {
                $("#billionare").show();
            }
            $("span#n_jobs").text(f(parseFloat(localStorage.getItem("0_n_jobs"))));
            $("span#n_good_jobs").text(f(parseFloat(localStorage.getItem("0_n_good_jobs"))));
            $("span#n_hosts").text(f(parseFloat(localStorage.getItem("0_n_hosts"))));
        }
        else {
           firstTime = true; 
        }
        var now = new Date();
        var today = new Date(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate());
        //var today = new Date(2012,11,15);
        if (navigator.onLine) {
            var request = get_user_stats(api_user, id); 
            request.done(function(user){
                update_user_stats_localstorage(user, today, firstTime);
                $("span#cpu_time").text(f(user.cpu_time));
                $("span#n_events").text(f(user.n_events));
                if (user.n_events >= 1000000000) {
                    $("#billionare").show();
                }
                $("span#n_jobs").text(f(user.n_jobs));
                $("span#n_good_jobs").text(f(user.n_good_jobs));
                $("span#n_hosts").text(f(user.n_hosts));
                $("#loading").hide();
                create_charts();
            });
        }
        else {
            $("#offline").show();
            $("#loading").hide();
            create_charts();
        }
    }

    if (id != null) {
        $("#userStats").show();
        update_user_stats_card(api_user, id);
    }
    else {
        $("#settings").show();
        $("#save").click(function(e){
            var id = $("#settings input[id=boincId]").val();
            // Save the value
            localStorage.setItem("user.id", id);
            reset_local_storage();
            update_user_stats_card(api_user, id);
        });
    }

    $("#settingsBtn").click(function(e){
        $("#settings").show();
        $("#userStats").hide();
        $("#save").click(function(e){
            var id = $("#settings input[id=boincId]").val();
            // Save the value
            localStorage.setItem("user.id", id);
            reset_local_storage();
            update_user_stats_card(api_user, id);
        });
    });

    function create_charts() {
       var snapshot_head = localStorage.getItem('snapshot_head'); 
       var palette = new Rickshaw.Color.Palette({scheme: 'cool'});
       if (snapshot_head == null) {
           snapshot_head = 0;
       }
       var horizontal = false;
       var i = 0;
       var point;

       var i = 0;
       var l = items.length;
       if (snapshot_head >=2) {
           $("#userCharts").show();
       }
       for(i;i<l;i++) {
           var data = [];
           var id = "#" + items[i] + "_chart";
           for (var j=0;j<=snapshot_head-1;j++) {
               if (j > 0) {
                var date = parseInt(localStorage.getItem(j + "_"+ items[i] + "_date"));
                var value = parseInt(localStorage.getItem(j + "_" + items[i]));
                var point = {x:date, y:value};
               }
               else {
                var date = parseInt(localStorage.getItem(j + "_"+ items[i] + "_date"));
                var value = 0;
                var point = {x:date, y:value};
               }
               data.push(point);
           }

           $(id).show();
           var graph = new Rickshaw.Graph({
               element: document.querySelector(id),
               renderer: 'bar',
               height: 100,
               series: [{
                   color: palette.color(),
                   data: data ,
               }
               ]
           });

           var xAxis = new Rickshaw.Graph.Axis.Time({
                graph: graph,
           });

           var yAxis = new Rickshaw.Graph.Axis.Y({
               graph: graph,
               pixelsPerTick: 30,
               tickFormat: Rickshaw.Fixtures.Number.formatKMBT,
           });

           xAxis.render();
           yAxis.render();
           graph.render();
           graph.update();
       }
    }


    $("#updateBtn").click(function(e){
        update_user_stats_card(api_user, id);
    });

    // Hook up the installation button, feel free to customize how
    // this works
    
    var install = require('install');

    function updateInstallButton() {
        $(function() {
            var btn = $('.install-btn');
            if(install.state == 'uninstalled') {
                btn.show();
            }
            else if(install.state == 'installed' || install.state == 'unsupported') {
                btn.hide();
            }
        });
    }

    $(function() {
        $('.install-btn').click(install);        
    });

    install.on('change', updateInstallButton);

    install.on('error', function(e, err) {
        // Feel free to customize this
        $('.install-error').text(err.toString()).show();
    });

    install.on('showiOSInstall', function() {
        // Feel free to customize this
        var msg = $('.install-ios-msg');
        msg.show();
        
        setTimeout(function() {
            msg.hide();
        }, 8000);
    });
});
