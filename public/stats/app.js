(function(){


var app = angular.module('app', ['ngRoute', 'ngMaterial', 'ngCookies']);

app.config(function($routeProvider, $mdThemingProvider){

  $mdThemingProvider.theme('default').
    primaryPalette('indigo', {
      'default': '500',
      'hue-1': '50'
    }).accentPalette('red', {
      'default': '700'
    })

  $mdThemingProvider.setDefaultTheme('default')

  $routeProvider.
  when('/', {
    redirectTo: '/overview'
  }).
  when('/overview',{
    templateUrl: 'stats/_overview.html',
    controller: 'OverviewCtrl'
  }).
  when('/compare',{
    templateUrl: 'stats/_threeteams.html',
    controller: 'TeamCtrl'
  }).
  when('/teams',{
    templateUrl: 'stats/_teams.html',
    controller: 'OverviewCtrl'
  }).
  when('/team/:id', {
    templateUrl: 'stats/_team.html',
    controller: 'TeamCtrl'
  }).
  otherwise({ redirectTo: '/overview' })

});

app.filter('objectOnly', function(){
  return function(items){
    var filtered = {}
    Object.keys(items).forEach(function(key) {
      if(typeof items[key] == 'object')
        filtered[key] = items[key]
    })

    return filtered
  }
});

app.controller('AppCtrl', function($mdSidenav, $scope, $location, $http, $cookies) {
  $scope.toggleSideNav = function(menuId) {
    $mdSidenav(menuId).toggle();
  };

  $scope.menu = [
    {
      title: 'Overview',
      icon: 'dashboard',
      path: '/overview'
    },
    {
      title: 'Teams',
      icon: 'list',
      path: '/teams'
    },
    {
      title: 'Compare',
      icon: 'compare_arrows',
      path: '/compare'
    },
    /*{ // to be re-implemented when the time comes
        title: 'Pit Scout',
        icon: 'create',
        path: '/scout/pit'
    },
    {
        title: 'Match Scout',
        icon: 'add',
        path: '/scout/match'
    },
    {
        title: 'Edit Match',
        icon: 'assignment',
        path: '/editmatch'
    }*/
  ];

  $scope.scoreToData = {
    'A_Portcullis': 'port',
    'A_ChevalDeFrise': 'cheval',
    'B_Ramparts': 'ramp',
    'B_Moat': 'moat',
    'C_SallyPort': 'sally',
    'C_Drawbridge': 'draw',
    'D_RockWall': 'rock',
    'D_RoughTerrain': 'rough'
  }

  $scope.defenses = {
    'port': 'Portcullis',
    'cheval': 'Cheval de Frise',
    'ramp': 'Ramparts',
    'moat': 'Moat',
    'sally': 'Sally Port',
    'draw': 'Draw Bridge',
    'rock': 'Rock Wall',
    'rough': 'Rough Terrain',
    'low': 'Low Bar'
  }

  $scope.setPath = function(path) {
      $location.path(path)
  }

  $scope.selectedTeams = []

  $scope.toggleSelected = function(num) {
    if($scope.selectedTeams.indexOf(num) > -1) {
      $scope.selectedTeams.splice($scope.selectedTeams.indexOf(num), 1)
    } else {
      $scope.selectedTeams.push(num)
    }
  }

  $scope.teams = {}
  $scope.tournament = {
    matches: [],
    scores: []
  }
  $scope.match = {}
  $scope.numMatches = 0
  $scope.numTeams = 0
  $scope.eventCode = $cookies.get('eventCode') || ''

  var emptyTeam = function(){
    return {
      pit: {},
      matches: [],
      picks: {
        'port': 0,
        'cheval': 0,
        'ramp': 0,
        'moat': 0,
        'sally': 0,
        'draw': 0,
        'rock': 0,
        'rough': 0,
      },
      totalMatches: 0
    }
  }

  $scope.teamList = []

  $scope.getTeams = function(num) {
    if(!num)
      num = 1
    console.log("Getting teams page",num)
    $http.get('/api/teams?eventCode='+$scope.eventCode+"&page="+num).success(function(resp){
      if(resp.pageCurrent == 1)
        $scope.teamList = []

      if(!resp.teams)
        return
      $scope.teamList = $scope.teamList.concat(resp.teams)
      resp.teams.forEach(function(team){
        if(!$scope.teams[team.teamNumber])
          $scope.teams[team.teamNumber] = emptyTeam()

        $scope.teams[team.teamNumber].meta = team
      })
      if(resp.pageCurrent < resp.pageTotal)
        $scope.getTeams(parseInt(resp.pageCurrent) + 1)
    })
  }

  $scope.updateTeams = function(){

    $scope.getTeams()

    $http.get('/api/schedule/'+$scope.eventCode+'/qual').success(function(data){
      $scope.tournament.matches = data.Schedule
      $scope.tournament.matches.forEach(function(match) {
        $scope.match[match.description.substr(0, 4) + " " + match.description.split(' ')[1]] = match
      })

      $http.get('/api/scores/'+$scope.eventCode+'/qual').success(function(data){
        $scope.tournament.scores = data.MatchScores
        $scope.tournament.scores.forEach(function(score) {
          var match = $scope.match[score.matchLevel.substr(0, 4) + " " + score.matchNumber]
          match.scoreRedFinal = score.Alliances[0].totalPoints
          match.scoreBlueFinal = score.Alliances[1].totalPoints
          match.picksRed = [
            score.Alliances[0].position2,
            score.Alliances[0].position4,
            score.Alliances[0].position5
          ].map(function(d){return $scope.scoreToData[d]})
          match.picksBlue = [
            score.Alliances[1].position2,
            score.Alliances[1].position4,
            score.Alliances[1].position5
          ].map(function(d){return $scope.scoreToData[d]})

          match.Teams.forEach(function(team){
            var teamNumber = team.teamNumber
            if(!$scope.teams[teamNumber]) {
              $scope.teams[teamNumber] = emptyTeam()
            }
            $scope.teams[teamNumber].totalMatches ++

            var side = team.station.substr(0, team.station.length-1)
            match['picks'+side].forEach(function(def){
              $scope.teams[teamNumber].picks[def] ++
            })

          })

        })
      })
    })


    $http.get('/data').success(function(data){
      $scope.scoutedFiles = Object.keys(data)
      $scope.numMatches = 0
      $scope.numTeams = 0
      for(var filename in data){
        var scoutData = data[filename]
        if(filename.startsWith('/data/pit_'))
          $scope.numTeams ++;
        else
          $scope.numMatches ++;

        filename = filename.split("_")
        var match = /[^\/]+$/.exec(filename[0])[0], team = /\d+/.exec(filename[1])[0]
        if(!$scope.teams[team]) {
          $scope.teams[team] = emptyTeam()
        }
        if(match == 'pit') {
          $scope.teams[team].pit = scoutData
        } else {
          scoutData.matchShort = match
          $scope.teams[team].matches.push(scoutData)
          if(!$scope.match[match])
            continue
          scoutData.matchName = $scope.match[match].description
        }
      }
    })
  }


  $scope.updateTeams();

});


app.controller('OverviewCtrl', function($scope, $location, $mdToast, $cookies, $http) {

  $scope.lastMatchData = []
  $scope.numScoutedTeams = 0

  $scope.updateEventCode = function() {
    $http.get('/api/schedule/'+$scope.eventCode+'/qual').success(function(resp){
      $cookies.put('eventCode', $scope.eventCode)
      location.reload()
    }).error(function(){
       $mdToast.show($mdToast.simple().textContent("Bad Event Code"));
    })
  }

  $scope.updateMatchData = function() {
    //$scope.lastMatchData = $scope.getLastMatch()
    $scope.numScoutedTeams = Object.keys($scope.teams).length
    console.log('updated')
  }

  $scope.$on('updateTeams', $scope.updateMatchData)
  if(!$scope.lastMatchData.length) {
    //$scope.updateMatchData();
  }

});

app.controller('TeamCtrl', function($scope, $routeParams, $location){
  console.log($routeParams.id)
  $scope.teamNumber = $routeParams.id

  $scope.defenses = {
    'port': 'Portcullis',
    'cheval': 'Cheval de Frise',
    'ramp': 'Ramparts',
    'moat': 'Moat',
    'sally': 'Sally Port',
    'draw': 'Draw Bridge',
    'rock': 'Rock Wall',
    'rough': 'Rough Terrain',
    'low': 'Low Bar'
  }

  $scope.select = function(match, index) {
    index = Math.floor(index/3)

    $scope.selectedTeams = match.Teams
      .slice(index*3, index*3+3)
      .map(function(t){
        console.log(t.teamNumber)
        return t.teamNumber
      })
  }

  $scope.attempts = function(num, defense) {
    if(!$scope.teams[num])
      return 'n/a'
    var total = 0
    for(var i in $scope.teams[num].matches) {
      var match = $scope.teams[num].matches[i]
      for(var k = -1; k <= 5; k++) {
        if(match.defenses[k] == defense) {
          total += match.tele.defenses[k].length
          break
        }
      }

    }
    return total
  }

  $scope.stuck = function(num, defense) {
    if(!$scope.teams[num])
      return 'n/a'

    var total = 0
    for(var i in $scope.teams[num].matches) {
      var match = $scope.teams[num].matches[i]

      for(var k = -1; k <= 5; k++) {
        if(match.defenses[k] == defense) {
          for(var j in match.tele.defenses[k]) {
            if(!match.tele.defenses[k][j])
              total ++;
          }
        }
      }


    }
    return total
  }

  $scope.tortuga = function(num, defense) {
    if(!$scope.teams[num])
      return 'n/a'

    var total = 0
    for(var i in $scope.teams[num].matches) {
      var match = $scope.teams[num].matches[i]

      for(var k = -1; k <= 5; k++) {
        if(match.defenses[k] == defense) {
          for(var j in match.tele.defenses[k]) {
            if(match.tele.defenses[k][j] == -1)
              total ++;
          }
        }
      }


    }
    return total
  }

  $scope.opportunities = function(num, defense) {
    if(!$scope.teams[num])
      return 'n/a'

    var total = 0
    for(var i in $scope.teams[num].matches) {
      var match = $scope.teams[num].matches[i]
      for(var k = -1; k <= 5; k++) {
        if(match.defenses[k] == defense) {
          total ++
          break
        }
      }

    }
    return total
  }

  $scope.percent = function(num, defense) {
    if(!$scope.teams[num])
      return 'n/a'

    var opportunities = 0;
    var attempts = 0

    for(var i in $scope.teams[num].matches) {
      var match = $scope.teams[num].matches[i]
      for(var k = -1; k <= 5; k++) {
        if(match.defenses[k] == defense) {
          attempts += !!match.tele.defenses[k].length
          opportunities ++
          break
        }
      }

    }
    
    if(!opportunities)
      return "n/a"

    return Math.floor(attempts / opportunities * 100) + "%"
  }

  $scope.showhigh = true
  $scope.showlow = false
  $scope.showhmiss = true
  $scope.showlmiss = false

  $scope.colors = {
    high: "#afa",
    low: "#aaf",
    hmiss: "#afa",
    lmiss: "#aaf"
  }

  $scope.getAvg = function(type, teamNum) {
    var num = 0
    if(!$scope.teams[teamNum] || !$scope.teams[teamNum].matches.length)
      return 'n/a'
    for(var i in $scope.teams[teamNum].matches) {
      var match = $scope.teams[teamNum].matches[i]
      for(var j in match.tele.shots) {
        var shot = match.tele.shots[j]
        if(shot.goal == type)
          num ++
      }
    }
    return Math.floor(num / $scope.teams[teamNum].matches.length * 10 + 0.5)/10
  }

  $scope.showShots = function(teamNum, timeout) {
    if(!teamNum) {
      $scope.selectedTeams.forEach($scope.showShots)
      return;
    }

    if(!$scope.teams[teamNum])
      return 'n/a'


    setTimeout(function(){
      var canvas = document.getElementById('fieldcanvas'+teamNum)
      var ctx = canvas.getContext('2d')
      ctx.canvas.width = ctx.canvas.height = 200
      var img = document.getElementById('halffieldimg')
      ctx.drawImage(img, 0, 0, 200, 200);
      ctx.lineWidth=3
      
      for(var i = 0; i < $scope.teams[teamNum].matches.length; i++) {
        var match = $scope.teams[teamNum].matches[i]
        for(var j = 0; j < match.tele.shots.length; j++) {
          var shot = match.tele.shots[j]
          if(!$scope['show'+shot.goal])
            continue;
          ctx.strokeStyle=$scope.colors[shot.goal]
          if(shot.goal.endsWith("miss")) {
            ctx.beginPath()
            ctx.moveTo(shot.x*200-5,shot.y*200-5)
            ctx.lineTo(shot.x*200+5,shot.y*200+5)
            ctx.moveTo(shot.x*200+5,shot.y*200-5)
            ctx.lineTo(shot.x*200-5,shot.y*200+5)
            ctx.stroke()
            
          } else {
            ctx.beginPath()
            ctx.arc(shot.x*200, shot.y*200, 5, 0, 6.29)
            ctx.stroke()            
          }

        }
      }
    }, (timeout ? 500 : 0))
  }

});

})();
