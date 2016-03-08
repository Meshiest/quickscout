require 'sinatra'
require 'sinatra/cookies'
require 'open-uri'
require 'json'
require 'uri'

#THE STAGING SERVER IS AVAILABLE AT: https://frc-staging-api.firstinspires.org
#THE PRODUCTION SERVER IS AVAILABLE AT: https://frc-api.firstinspires.org
$server = 'https://frc-api.firstinspires.org/v2.0/'+Time.now.year.to_s+'/'

$token = open('frcapi').read

set :bind, '0.0.0.0'
set :port, 8080

Dir.mkdir 'public/data' unless File.exists? 'public/data'

def api path
  return `curl #{$server}#{path} -H "Authorization: Basic #{$token}" -H "accept: application/json"`
end

$requests = {}

get %r{^\/api\/.*$} do
  req = request.path[5..-1]+"?"+params.to_a.map{|p|p*?=}*?&
  puts req
  content_type :json
  if $requests[req] && ($requests[req][:time] + 60 * 1000 > Time.now.to_f) 
    $requests[req][:data]
  else
    $requests[req] = {
      data: api(req),
      time: Time.now.to_f
    }
    $requests[req][:data]
  end
end

$events = api('events/')

get '/events' do
  content_type :json
  $events
end

get '/scout' do
  erb :scout
end

post '/match' do
  begin
    data = JSON.parse(params[:scout] || '')
    open('public/data/'+data['match']+"_"+data['teamNumber'].to_s+".json",'w'){|f|
      f << params[:scout]
    }
    '{"msg":"Success"}'
    status 200
  rescue => e
    puts e
    status 403
  end

end

post '/pit' do
  begin
    data = JSON.parse(params[:scout] || '')
    open('public/data/pit_'+data['main']['teamNumber'].to_s+".json",'w'){|f|
      f << params[:scout]
    }
    '{"msg":"Success"}'
    status 200
  rescue => e
    puts e
    status 403
  end

end

before do
  if File.exist?('debug')
    headers 'Cache-Control' => 'no-cache, must-revalidate'
  end
end

get '/' do
  erb :stats
end

get '/data' do
  Dir["public/data/*"].map{|l|l[/\/data\/.*$/]}.to_json
end

get '/stats.appcache' do
  headers['Content-Type'] = 'text/cache-manifest'

  data = Dir["public/data/*"].map{|l|
    [URI.escape(l[/\/data\/.*$/])]*2*' '
  }*"\n"

  """CACHE MANIFEST
/angular-material.min.css
/icons.woff2
/icons.css
/angular.js
/angular-route.min.js
/angular-cookies.min.js
/angular-animate.min.js
/angular-aria.min.js
/angular-messages.min.js
/angular-material.min.js
/halffield.png
/
/stats/app.js
/stats/style.css
/stats/_overview.html
/stats/_defenses.html
/stats/_shots.html
/stats/_team.html
/stats/_threeteams.html

FALLBACK:
# Scouted Data
/data /data
#{data}

# Event Code (Changes with cookies)
/api/scores/#{cookies['eventCode']}/qual /api/scores/#{cookies['eventCode']}/qual
/api/matches/#{cookies['eventCode']}/ /api/matches/#{cookies['eventCode']}/ 

NETWORK:
"""
end