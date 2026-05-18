export default function Loading() {
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-[#F5F3EF]">
            <div className="flex flex-col items-center gap-5">
                <div className="flex items-end gap-[5px] h-8">
                    {[0, 1, 2, 3, 4].map((i) => (
                        <span
                            key={i}
                            className="w-[4px] rounded-full bg-[#8E6F5E]"
                            style={{
                                animation: `waveBar 1.1s ease-in-out infinite`,
                                animationDelay: `${i * 0.13}s`,
                            }}
                        />
                    ))}
                </div>
                <span className="text-[13px] text-[#9A9A9A] tracking-wide">
                    Waveform
                </span>
            </div>
            <style>{`
                @keyframes waveBar {
                    0%, 100% { height: 8px; opacity: 0.4; }
                    50%       { height: 28px; opacity: 1; }
                }
            `}</style>
        </div>
    );
}
