//% color=#1E90FF weight=100 icon=""
namespace micpitch {
    const SAMPLE_PIN = AnalogPin.P0
    const SAMPLE_RATE = 4000 // Hz
    const SAMPLE_INTERVAL_US = Math.floor(1000000 / SAMPLE_RATE)
    const BUFFER_SIZE = 256

    function sampleBuffer(): number[] {
        let buf: number[] = []
        for (let i = 0; i < BUFFER_SIZE; i++) {
            // アナログ値をサンプリング
            buf.push(pins.analogReadPin(SAMPLE_PIN))
            control.waitMicros(SAMPLE_INTERVAL_US)
        }
        return buf
    }

    function autocorrelate(buf: number[], minLag: number, maxLag: number): number {
        // 平均を引く
        let mean = 0
        for (let i = 0; i < buf.length; i++) mean += buf[i]
        mean = mean / buf.length
        let norm: number[] = []
        for (let i = 0; i < buf.length; i++) norm.push(buf[i] - mean)

        let bestLag = -1
        let bestCorr = 0
        for (let lag = minLag; lag <= maxLag; lag++) {
            let corr = 0
            for (let i = 0; i + lag < norm.length; i++) {
                corr += norm[i] * norm[i + lag]
            }
            if (corr > bestCorr) {
                bestCorr = corr
                bestLag = lag
            }
        }
        return bestLag
    }

    function estimateFrequency(): number {
        let buf = sampleBuffer()
        // 関心周波数帯域（低めと高めの制限）
        const minFreq = 82 // 約 E2
        const maxFreq = 2000
        const minLag = Math.max(2, Math.floor(SAMPLE_RATE / maxFreq))
        const maxLag = Math.max(minLag + 1, Math.floor(SAMPLE_RATE / minFreq))

        let lag = autocorrelate(buf, minLag, maxLag)
        if (lag <= 0) return 0
        let freq = SAMPLE_RATE / lag
        return freq
    }

    /**
     * 周波数（Hz）を取得します。検出できない場合は 0 を返します。
     */
    //% block="周波数（Hz）を取得"
    export function getFrequency(): number {
        return Math.floor(estimateFrequency())
    }

    /**
     * 音程を MIDI ノート番号で返します（例: 60 = C4）。検出できない場合は 0 を返します。
     */
    //% block="音程（MIDI）を取得"
    export function getPitchNote(): number {
        let f = estimateFrequency()
        if (f <= 0) return 0
        let note = Math.round(69 + 12 * Math.log(f / 440) / Math.log(2))
        return note
    }
}
