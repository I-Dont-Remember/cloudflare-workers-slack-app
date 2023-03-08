#! /bin/bash

url="http://localhost:8787/slack/events"

json_str='{
    "event": {
        "type": "app_home_opened",
        "user": "U061F7AUR",
        "text": "<@U0LAN0Z89> is it everything a river should be?",
        "ts": "1515449522.000016",
        "channel": "C0LAN2Q65",
        "event_ts": "1515449522000016"
    }
}'

# curl 7.82+
# curl --json "$json_str" "$url"

curl -D- -X POST --header "Content-Type: application/json" --data "$json_str" "$url"
echo -e "\n"