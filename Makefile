.PHONY: serve experiments test

serve:
	python3 -m http.server 4173 --directory dist

experiments:
	python3 scripts/run_experiments.py

test:
	node --check dist/app.js
	node --check dist/model.js
	node tests/test_model.cjs
	python3 -m unittest discover -s tests -v
