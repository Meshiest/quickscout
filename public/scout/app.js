(function(){


var app = angular.module('app', ['ngRoute', 'ngCookies']);

app.config(function($routeProvider){

  $routeProvider.
  when('/', {
    templateUrl: '_scout',
  }).
  otherwise({ redirectTo: '/' })

});

app.controller('AppCtrl', function($scope, $location, $http, $cookies, $timeout) {
  $scope.setPath = function(path) {
      $location.path(path)
  }

  $scope.notify = function(msg) {
    console.log(msg)
  }

  $scope.emptyMatchScout = function(){
    return {
      defenses: {},
      auto: {},
      tele: {
        defenses: {},
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
  
  $scope._eventCode = $scope.eventCode = $cookies.get('eventCode') || ''
  $scope._scoutSide = $scope.scoutSide = $cookies.get('scoutSide') || ''

  $scope.currTab = $cookies.get('currTab') || 'pit'

  $scope.matches = $cookies.getObject('matches') || []
  $scope.scoutedMatches = $cookies.getObject('scoutedMatches') || {}
  $scope.currMatch = parseInt($cookies.get('currMatch') || '0')
  $timeout(function(){$scope.setCurrMatch($scope.currMatch)}, 500)

  $scope.pitQueue = $cookies.getObject('pitQueue') || []
  $scope.scoutedTeams = $cookies.getObject('scoutedTeams') || {}
  $scope.currTeam = parseInt($cookies.get('currTeam') || '0')
  $timeout(function(){$scope.setCurrTeam($scope.currTeam)}, 500)

  $scope.scout = $scope.getScout()
  $scope.events = undefined

  $http.get('/events').success(function(resp){
    $scope.events = resp.Events
  })

  $scope.setCurrMatch = function(num) {
    num = Math.min($scope.matches.length-1, Math.max(0, num))
    $scope.currMatch = num;
    var match = $scope.matches[num][0]
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
    $http.get('/api/matches/'+$scope._eventCode+'/').
      success(function(resp) {
        if($scope._eventCode != $scope.eventCode) {
          var cookies = $cookies.getAll()
          for(var key in cookies) {
            if(key.startsWith("scout_"))
              $cookies.remove(key)
          }
          $cookies.remove('scoutedMatches')
          $scope.scoutedMatches = {}
          $cookies.remove('currMatch')
          $scope.currMatch = 0
          $scope.scout = $scope.getScout()


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
      }).error(function(err) {
        $scope.notify("Couldn't get match data")
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


  $scope.sendData = function() {
    if(!$scope.events)
      return;

    Object.keys($scope.scoutedMatches).forEach(function(match){
      if($scope.scoutedMatches[match] == 's' || !$scope.scoutedMatches[match])
        return;

      var obj = $cookies.getObject("scout_"+match)
      obj.eventCode = $scope.eventCode
      
      $http({
        method: 'POST',
        url: '/match',
        headers: {
          'Content-Type': 'application/json'
        },
        params: {
          scout: JSON.stringify(obj)
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
          scout: JSON.stringify($cookies.getObject("pit_"+team))
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
    $scope.scoutedTeams[team] = true
    $cookies.putObject('scoutedTeams', $scope.scoutedTeams)
    $cookies.putObject('pit_'+team, data)
    $scope.notify("Saved "+team)
    console.log($cookies.getAll())
  }

  $scope.clearTeam = function(num) {
    var shouldClear = confirm("Clear Scouted Data for " + $scope.pitQueue[num] + "?")
    if(shouldClear) {
      $cookies.remove('pit_'+$scope.pitQueue[num])
      delete $scope.scoutedTeams[$scope.pitQueue[num]];
      $cookies.putObject('scoutedTeams', $scope.scoutedTeams)
      $scope.notify("Cleared "+$scope.pitQueue[num])
    }
  }



});


})();
