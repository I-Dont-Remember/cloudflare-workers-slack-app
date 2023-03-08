
run:
	./wrangle dev

send_test_event:
	./send-test-event.sh

deploy:
	./wrangle publish

prod-logs:
	./wrangle tail
