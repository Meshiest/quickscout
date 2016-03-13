(function(){


var app = angular.module('app', ['ngRoute', 'ngCookies']);

app.config(function($routeProvider){

  $routeProvider.
  when('/', {
    templateUrl: '_scout',
  }).
  otherwise({ redirectTo: '/' })

});

app.filter('five', function() {
  return function(arr) {
    return arr.reverse().slice(0, Math.min(5, arr.length))
  };
});


app.controller('AppCtrl', function($scope, $location, $http, $cookies, $timeout) {
  $scope.setPath = function(path) {
      $location.path(path)
  }

  $scope.notify = function(msg) {
    var note = {
      msg: msg,
      create: new Date().getTime()
    }
    $scope.notifications.push(note)
    $timeout(function(){$scope.removeNote(note)}, 5000)
    console.log(msg)
  }

  $scope.removeNote = function(note) {
    var index = $scope.notifications.indexOf(note)
    if(index > -1)
      $scope.notifications.splice(index, 1)
  }

  $scope.emptyMatchScout = function(){
    return {
      defenses: {},
      auto: {},
      tele: {
        defenses: {1:[],2:[],3:[],4:[],5:[]},
        shots: [],
      },
      ball: {},
      other: {}
    }
  }

  $scope.emptyPitScout = function() {
    return {
      main: {},
      auto: {},
      tele: {},
      abilities: {},
      other: {}
    }
  }

  $scope.getScout = function() {
    switch($scope.currTab) {
      case 'pit':
        if(!$scope.pitQueue.length) {
          return $scope.emptyPitScout();
          break;
        }

        var team = $scope.pitQueue[$scope.currTeam]
        var scout = $cookies.getObject("pit_"+team) || $scope.emptyPitScout();
        scout.main.teamNumber = team
        if($scope.team[team])
          scout.main.teamName = $scope.team[team].nameShort
        return scout
        break;

      case 'match':
        if(!Object.keys($scope.matches).length) {
          return $scope.emptyMatchScout()
          break;
        }

        var match = $scope.matches[$scope.currMatch][0]
        return $cookies.getObject("scout_"+match) || $scope.emptyMatchScout()
        break;
    }
  }

  $scope.clickX =  0
  $scope.clickY = 0

  $scope.updating = false
  
  $scope._eventCode = $scope.eventCode = $cookies.get('eventCode') || ''
  $scope._scoutSide = $scope.scoutSide = $cookies.get('scoutSide') || ''

  $scope.currTab = $cookies.get('currTab') || 'pit'
  $scope.path = []

  $scope.matches = $cookies.getObject('matches') || []
  $scope.scoutedMatches = $cookies.getObject('scoutedMatches') || {}
  $scope.currMatch = parseInt($cookies.get('currMatch') || '0')
  $timeout(function(){$scope.setCurrMatch($scope.currMatch)}, 500)

  $scope.pitQueue = $cookies.getObject('pitQueue') || []
  $scope.scoutedTeams = $cookies.getObject('scoutedTeams') || {}
  $scope.currTeam = parseInt($cookies.get('currTeam') || '0')
  $timeout(function(){$scope.setCurrTeam($scope.currTeam)}, 500)

  $scope.team = {}
  $scope.events = undefined
  $scope.teams = undefined
  $scope.scout = $scope.getScout()

  $scope.notifications = []

  $http.get('/events').success(function(resp){
    $scope.events = resp.Events
  })

  $scope.words = []

  $http.get('/words').success(function(resp){
    $scope.words = resp
  })

  $scope.getTeams = function(num) {
    if(!num)
      num = 1
    console.log("Getting page",num)
    $scope.teams = []
    $http.get('/api/teams?eventCode='+$scope.eventCode+"&page="+num).success(function(resp){
      console.log(resp.teams)
      if(!resp.teams)
        return
      $scope.teams = $scope.teams.concat(resp.teams)
      resp.teams.forEach(function(team){
        $scope.team[team.teamNumber] = team
      })
      if(resp.pageCurrent < resp.pageTotal)
        $scope.getTeams(parseInt(resp.pageCurrent) + 1)
    })
  }
  if($scope.eventCode)
    $scope.getTeams()


  $scope.setCurrMatch = function(num) {
    num = Math.min($scope.matches.length-1, Math.max(0, num))
    $scope.currMatch = num;
    $scope.scout = $scope.getScout()
    $cookies.put('currMatch', num)
    var list = $('#matchListDiv');
    var next = Math.max(0, num-2)
    list.scrollTop( 
      list.scrollTop() + $($('#matchListDiv table tbody').children()[next]).offset().top - list.offset().top
    )
  }

  $scope.setCurrTeam = function(num) {
    num = Math.min($scope.pitQueue.length-1, Math.max(0, num))
    $scope.currTeam = num;
    var team = $scope.pitQueue[num]
    $scope.scout = $scope.getScout()
    $cookies.put('currTeam', num)
  }

  $scope.setTab = function(tab) {
    $scope.currTab = tab;
    $cookies.put('currTab', tab)
    $scope.scout = $scope.getScout();
  }

  $scope.getMatches = function() {
    $scope.updating = true
    $http.get('/api/schedule/'+$scope._eventCode+'/qual').
      success(function(resp) {
        $scope.updating = false
        if($scope._eventCode != $scope.eventCode) {
          $scope.clearData(true)
        }

        $scope.matches = resp.Matches.map(function(obj){
          var team = obj.Teams[0].teamNumber
          for(var i = 0; i < obj.Teams.length; i++) {
            if(obj.Teams[i].station == $scope._scoutSide) {
              team = obj.Teams[i].teamNumber
            }
          }
          return [obj.description.substr(0, 4) + " " + obj.description.split(' ')[1], team]
        });
        $scope.eventCode = $scope._eventCode
        $scope.scoutSide = $scope._scoutSide
        $cookies.put('eventCode', $scope.eventCode)
        $cookies.put('scoutSide', $scope.scoutSide)
        $cookies.putObject('matches', $scope.matches)

        $scope.getTeams()


      }).error(function(err) {
        $scope.notify("Couldn't get match data")
        $scope.updating = false
      })
  }

  $scope.imageClick = function($event) {
    var element = $('#fieldcanvas')
    var x = $event.offsetX / element.width()
    var y = $event.offsetY / element.height()
    console.log(Math.floor(x*1000)/10, Math.floor(y*1000)/10)
    $scope.clickX = x
    $scope.clickY = y
  }

  $scope.attempt = function(i, val) {
    $scope.scout.tele.defenses[i].push(val)
  }

  $scope.removeAttempt = function(i, pos) {
    if($scope.scout.tele.defenses[i].length <= pos)
      return;
    $scope.scout.tele.defenses[i].splice(pos, 1)
  }

  $scope.lastItems = function(i, num) {
    if($scope.currTab != 'match')
      return
    var data = $scope.scout.tele.defenses[i]
    var out = {}
    for(var i = Math.max(data.length-num, 0); i < data.length; i++) {
      out[i] = data[i]
    }
    return out
  }


  $scope.addShot = function(goal) {
    if(!$scope.clickX && !$scope.clickY) {
      return;
    }

    $scope.scout.tele.shots.push({
      goal: goal,
      x: $scope.clickX,
      y: $scope.clickY
    })
    renderTouch()
    $scope.clickX = $scope.clickY = undefined
  }

  $scope.removeShot = function(pos) {
    $scope.scout.tele.shots.splice(pos, 1)
  }

  $scope.saveMatch = function() {
    var data = $scope.scout
    var match = $scope.matches[$scope.currMatch]
    data.teamNumber = match[1]
    data.match = match[0]
    $scope.scoutedMatches[match[0]] = true
    $cookies.putObject('scoutedMatches', $scope.scoutedMatches)
    $cookies.putObject('scout_'+match[0], data)
    $scope.notify("Saved "+match[0])
  }

  $scope.clearMatch = function(num) {
    if(!$scope.matches[num])
        return

    var shouldClear = confirm("Clear Scouted Data for " + $scope.matches[num][0] + "?")
    if(shouldClear) {
      $cookies.remove('scout_'+$scope.matches[num][0])
      delete $scope.scoutedMatches[$scope.matches[num][0]];
      $cookies.putObject('scoutedMatches', $scope.scoutedMatches)
      $scope.notify("Cleared "+$scope.matches[num][0])
    }
  }

  $scope.setScouted = function(match, value) {
    $scope.scoutedMatches[match] = value
    $cookies.putObject('scoutedMatches', $scope.scoutedMatches)
  }

  $scope.setScoutedTeam = function(team, value) {
    $scope.scoutedTeams[team] = value
    $cookies.putObject('scoutedTeams', $scope.scoutedTeams)
  }

  $scope.uploadDoodles = function(){
    $http.get('/doodles').success(function(){
      $scope.notify("Updoodled Successfully")
    }).error(function(){
      $scope.notify("Couldn't updoodle")
    })
  }

  $scope.sendData = function() {
    if(!$scope.events)
      return;

    Object.keys($scope.scoutedMatches).forEach(function(match){
      if($scope.scoutedMatches[match] == 's' || !$scope.scoutedMatches[match])
        return;
      
      $http({
        method: 'POST',
        url: '/match',
        headers: {
          'Content-Type': 'application/json'
        },
        params: {
          match: match
        }
      }).
        success(function(resp){
          console.log("Successfully sent "+match)
          $scope.scoutedMatches[match] = 's'
          $cookies.putObject('scoutedMatches', $scope.scoutedMatches)
        }).
        error(function(resp){
          console.log("Error in sending "+match)
        })

    })

    Object.keys($scope.scoutedTeams).forEach(function(team){
      if($scope.scoutedTeams[team] == 's' || !$scope.scoutedTeams[team])
        return;

      $http({
        method: 'POST',
        url: '/pit',
        headers: {
          'Content-Type': 'application/json'
        },
        params: {
          pit: team
        }
      }).
        success(function(resp){
          console.log("Successfully sent "+team)
          $scope.scoutedTeams[team] = 's'
          $cookies.putObject('scoutedTeams', $scope.scoutedTeams)
        }).
        error(function(resp){
          console.log("Error in sending "+team)
        })

    })
  }

  $scope.addQueue = function(num) {
    if($scope.pitQueue.indexOf(num) > -1)
      return;

    if(!num)
      return;

    $scope.pitQueue.push(num)
    $scope.tempTeamNum = ''
    if($('#tempTeamNum')[0])
      $('#tempTeamNum')[0].value = ''
    $cookies.putObject('pitQueue', $scope.pitQueue)
  }

  $scope.removeQueue = function(index) {
    $scope.pitQueue.splice(index, 1)
    $scope.setCurrTeam(index)
    $cookies.putObject('pitQueue', $scope.pitQueue)
  }

  $scope.saveTeam = function() {
    var data = $scope.scout
    console.log(data)
    var team = data.main.teamNumber
    if(!team)
      return;
    if($scope.pitQueue.indexOf(team) == -1) {
      $scope.addQueue(team)
    }
    $scope.scoutedTeams[team] = true
    $cookies.putObject('scoutedTeams', $scope.scoutedTeams)
    $cookies.putObject('pit_'+team, data)
    $scope.notify("Saved "+team)
    console.log($cookies.getAll())
  }

  $scope.clearTeam = function(num) {
    if(!$scope.pitQueue[num])
      return

    var shouldClear = confirm("Clear Scouted Data for " + $scope.pitQueue[num] + "?")
    if(shouldClear) {
      $cookies.remove('pit_'+$scope.pitQueue[num])
      delete $scope.scoutedTeams[$scope.pitQueue[num]];
      $cookies.putObject('scoutedTeams', $scope.scoutedTeams)
      $scope.notify("Cleared "+$scope.pitQueue[num])
    }
  }

  $scope.clearData = function(shouldClear) {
    if(!shouldClear)
      shouldClear = confirm('Clear All Data?')
    if(shouldClear) {
      var cookies = $cookies.getAll()
      for(var key in cookies) {
        if(key.startsWith('scout_') || key.startsWith("pit_")) {
          console.log(key)
          $cookies.remove(key)
        }
      }
      $cookies.remove('scoutedMatches')
      $scope.scoutedMatches = {}
      $cookies.remove('currMatch')
      $scope.currMatch = 0
      $cookies.remove('pitQueue')
      $scope.pitQueue = []
      $cookies.remove('scoutedTeams')
      $scope.scoutedTeams = {}
      $scope.currTeam = 0
      $cookies.remove('currTeam')
    }
  }



});

app.directive("drawing", function($cookies){
  return {
    restrict: "A",
    link: function(scope, element){
      var ctx = element[0].getContext('2d');
      console.log(element[0].width,element[0].height,ctx.canvas.width, ctx.canvas.height)
      ctx.canvas.width = 200
      ctx.canvas.height = 200
      // variable that decides if something should be drawn on mousemove
      var drawing = false;

      // the last coordinates before the current move
      var lastX = {};
      var lastY = {};
      scope.path = []
      doodleEnded = false

      function endDoodle() {
        if(!scope.words[scope.currMatch])
          return;
      
        if(!doodleEnded) {
          doodleEnded = true
          scope.notify('Ended doodle of '+(scope.words[scope.currMatch] || 'n/a'))

          console.log('match', $cookies.get('currMatch'))
          $cookies.putObject('doodle_'+scope.words[scope.currMatch], scope.path)
        }
      }

      element.bind('mousedown touchstart', function(event){
        event.preventDefault()
        reset()
        if(event.type.startsWith("touch")) {
          for(var j in event.originalEvent.changedTouches) {
            var touch = event.originalEvent.changedTouches[j]
            var i = touch.identifier
            if(i != 0)
              return
            
            lastX[i] = touch.pageX
            lastY[i] = touch.pageY
            scope.path = [[
              (lastX[i] - event.currentTarget.offsetLeft)/200,
              (lastY[i] - event.currentTarget.offsetTop)/200]]
            doodleEnded = false
          }
        } else {
          if(event.offsetX!==undefined){
            lastX.m = event.offsetX;
            lastY.m = event.offsetY;
          } else { // Firefox compatibility
            lastX.m = event.layerX - event.currentTarget.offsetLeft;
            lastY.m = event.layerY - event.currentTarget.offsetTop;
          }
          scope.path = [[lastX.m/200, lastY.m/200]]
          doodleEnded = false
          drawing = true;
        }


      });
      element.bind('mousemove touchmove', function(event){
        event.preventDefault()
        if(event.type.startsWith("touch")) {
          for(var j in event.originalEvent.changedTouches) {
            var touch = event.originalEvent.changedTouches[j]
            var i = touch.identifier
            if(i != 0)
              return
            if(lastX[i]) {
              var x = event.currentTarget.offsetLeft
              var y = event.currentTarget.offsetTop
              if(scope.path.length < 100) {
                draw(lastX[i]-x, lastY[i]-y, touch.pageX-x, touch.pageY-y)
                scope.path.push([(lastX[i]-x)/200, (lastY[i]-y)/200])
              } else {
                endDoodle()
                
              }
            }
            lastX[i] = touch.pageX
            lastY[i] = touch.pageY

          }
        } else {
          if(drawing){
            // get current mouse position
            if(event.offsetX!==undefined){
              currentX = event.offsetX;
              currentY = event.offsetY;
            } else {
              currentX = event.layerX - event.currentTarget.offsetLeft;
              currentY = event.layerY - event.currentTarget.offsetTop;
            }

            if(scope.path.length < 100) {
              scope.path.push([currentX/200, currentY/200])
              draw(lastX.m, lastY.m, currentX, currentY);
              
            } else {
              endDoodle()
            }

            // set current coordinates to last one
            lastX.m = currentX;
            lastY.m = currentY;
          }    
        }

      });
      element.bind('mouseup touchend', function(event){
        event.preventDefault()
        if(event.type.startsWith("touch")) {
          for(var j in event.originalEvent.changedTouches) {
            var touch = event.originalEvent.changedTouches[j]
            var i = touch.identifier
            if(i != 0)
              return
            
            lastX[i] = 0
            lastY[i] = 0
            endDoodle()

          }
        } else {
          drawing = false;
          endDoodle()

        }
      });

      // canvas reset
      function reset(){
       element[0].width = element[0].width; 
      }

      function draw(lX, lY, cX, cY){
        console.log(~~lX,~~lY,~~cX,~~cY)
        ctx.beginPath();
        // line from
        ctx.moveTo(~~lX,~~lY);
        // to
        ctx.lineTo(~~cX,~~cY);
        // color
        ctx.strokeStyle = "#000";
        // draw it
        ctx.stroke();
      }
    }
  };
});


})();
