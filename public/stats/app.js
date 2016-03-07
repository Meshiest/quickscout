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

  $scope.setPath = function(path) {
      $location.path(path)
  }

  $scope.teams = {}
  $scope.tournament = {}
  $scope.match = {}
  $scope.numMatches = 0
  $scope.numTeams = 0
  $scope.eventCode = $cookies.get('eventCode') || ''

  $scope.updateTeams = function(){

    $http.get('/api/matches/'+$scope.eventCode+'/').success(function(data){
      $scope.tournament.matches = data.Matches
      data.Matches.forEach(function(match) {
        $scope.match[match.description.substr(0, 4) + " " + match.description.split(' ')[1]] = match
      })
    })

    $http.get('/data').success(function(data){
      $scope.scoutedFiles = data
      $scope.numMatches = 0
      $scope.numTeams = 0
      data.forEach(function(filename){
        console.log(filename + " pit?: " + filename.startsWith('/data/pit_'))
        if(filename.startsWith('/data/pit_'))
          $scope.numTeams ++;
        else
          $scope.numMatches ++;

        $http.get(filename).success(function(scoutData){
          filename = filename.split("_")
          var match = /[^\/]+$/.exec(filename[0])[0], team = /\d+/.exec(filename[1])[0]
          if(!$scope.teams[team]) {
            $scope.teams[team] = {
              pit: {},
              matches: []
            }
          }
          if(match == 'pit') {
            $scope.teams[team].pit = scoutData
          } else {
            scoutData.matchShort = match
            scoutData.matchName = $scope.match[match].description
            $scope.teams[team].matches.push(scoutData)
          }
        })
      })
    })

    /*$http.get('teams.php').success(function(data){

      console.log("Got teams")
      
      data.teams.forEach($scope.handleTeam)
    })*/
  }


  $scope.updateTeams();

});


app.controller('OverviewCtrl', function($scope, $location, $mdToast, $cookies, $http) {

  $scope.lastMatchData = []
  $scope.numScoutedTeams = 0

  $scope.updateEventCode = function() {
    $http.get('/api/matches/'+$scope.eventCode+'/').success(function(resp){
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

  /*$scope.pie = {
    type: 'PieChart'
  }

  $scope.pie.data = {"cols": [
        {id: "t", label: "Topping", type: "string"},
        {id: "s", label: "Slices", type: "number"}
    ], "rows": [
        {c: [
            {v: "Mushrooms"},
            {v: 3},
        ]},
        {c: [
            {v: "Olives"},
            {v: 31}
        ]},
        {c: [
            {v: "Zucchini"},
            {v: 1},
        ]},
        {c: [
            {v: "Pepperoni"},
            {v: 2},
        ]}
    ]};

    $scope.pie.options = {
        'legend': 'none'
    };*/

});

app.controller('TeamCtrl', function($scope, $routeParams, $location){
  console.log($routeParams.id)
  $scope.teamNumber = $routeParams.id

  $scope.defenses = {
    'port': 'Porticullis',
    'cheval': 'Cheval de Frise',
    'ramp': 'Ramparts',
    'moat': 'Moat',
    'sally': 'Sally Port',
    'rock': 'Rock Wall',
    'rough': 'Rough Terrain',
    'low': 'Low Bar'
  }

  $scope.attempts = function(defense) {
    var total = 0
    for(var i in $scope.teams[$scope.teamNumber].matches) {
      var match = $scope.teams[$scope.teamNumber].matches[i]
      for(var k = -1; k <= 5; k++) {
        if(match.defenses[k] == defense) {
          total += match.tele.defenses[k].length
          break
        }
      }

    }
    return total
  }

  $scope.stuck = function(defense) {
    var total = 0
    for(var i in $scope.teams[$scope.teamNumber].matches) {
      var match = $scope.teams[$scope.teamNumber].matches[i]

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

  $scope.opportunities = function(defense) {
    var total = 0
    for(var i in $scope.teams[$scope.teamNumber].matches) {
      var match = $scope.teams[$scope.teamNumber].matches[i]
      for(var k = -1; k <= 5; k++) {
        if(match.defenses[k] == defense) {
          total ++
          break
        }
      }

    }
    return total
  }

  $scope.percent = function(defense) {
    var opportunities = 0;
    var attempts = 0

    for(var i in $scope.teams[$scope.teamNumber].matches) {
      var match = $scope.teams[$scope.teamNumber].matches[i]
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

});

})();
