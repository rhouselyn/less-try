from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    console_logs = []
    page.on('console', lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))

    page.goto('http://localhost:5173')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2000)

    test_result = page.evaluate("""
    () => {
        const results = {};
        results.synthesisExists = typeof window.speechSynthesis !== 'undefined';
        results.getVoicesCount = window.speechSynthesis.getVoices().length;
        results.getVoicesSample = window.speechSynthesis.getVoices().slice(0, 5).map(v => v.lang + ':' + v.name);

        return new Promise((resolve) => {
            if (!window.speechSynthesis) {
                results.error = 'speechSynthesis not available';
                resolve(results);
                return;
            }

            const utterance = new SpeechSynthesisUtterance('hello');
            utterance.lang = 'en-US';
            utterance.rate = 0.9;
            utterance.volume = 1;

            let resolved = false;
            utterance.onstart = () => {
                if (!resolved) {
                    resolved = true;
                    results.onstartFired = true;
                    results.speakingAfterStart = window.speechSynthesis.speaking;
                    resolve(results);
                }
            };
            utterance.onend = () => {
                if (!resolved) {
                    resolved = true;
                    results.onendFired = true;
                    resolve(results);
                }
            };
            utterance.onerror = (e) => {
                if (!resolved) {
                    resolved = true;
                    results.onerrorFired = true;
                    results.errorType = e.error;
                    resolve(results);
                }
            };

            window.speechSynthesis.speak(utterance);

            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    results.timeout = true;
                    results.speakingState = window.speechSynthesis.speaking;
                    results.pendingState = window.speechSynthesis.pending;
                    resolve(results);
                }
            }, 5000);
        });
    }
    """)

    print("=== Speech Synthesis Test Results ===")
    for key, value in test_result.items():
        print(f"  {key}: {value}")

    print("\n=== Console Logs ===")
    for log in console_logs:
        print(f"  {log}")

    browser.close()
