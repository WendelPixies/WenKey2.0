import { useMemo } from 'react';
import { differenceInDays, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PieChart } from 'lucide-react';

interface Quarter {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    is_active: boolean;
}

interface ActiveQuarterInfoProps {
    quarter: Quarter;
}

export function ActiveQuarterInfo({ quarter }: ActiveQuarterInfoProps) {
    const info = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const start = parseISO(quarter.start_date);
        const end = parseISO(quarter.end_date);

        // Ensure accurate day calculation
        const totalDays = differenceInDays(end, start) + 1;
        const daysPassed = differenceInDays(today, start) + 1;
        const daysRemaining = Math.max(0, differenceInDays(end, today));

        const progress = Math.min(100, Math.max(0, (daysPassed / totalDays) * 100));

        // Try to extract cycle number from name (e.g., "Q1 2026" -> 1, "Quarter 2" -> 2)
        const cycleMatch = quarter.name.match(/Q?(\d)/i);
        const cycleNumber = cycleMatch ? cycleMatch[1] : '?';

        return {
            cycleNumber,
            startDate: format(start, 'dd/MM/yy'),
            endDate: format(end, 'dd/MM/yy'),
            daysRemaining,
            formattedDaysRemaining: `${daysRemaining} dia${daysRemaining !== 1 ? 's' : ''}`,
            progress,
            currentDay: Math.max(1, daysPassed),
            isFuture: today < start,
            isFinished: today > end,
        };
    }, [quarter]);

    if (info.isFuture) {
        return (
            <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border border-muted w-full">
                <div className="text-sm font-medium text-muted-foreground">
                    Próximo ciclo: {quarter.name} <br />
                    Inicia em: {info.startDate}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col w-full h-full font-sans bg-background/50 p-4 rounded-xl gap-3 justify-center">
            <div className="flex items-center justify-between w-full">
                {/* Left Section: Icon & Title */}
                <div className="flex items-center gap-4">
                    <div className="relative w-10 h-10 flex items-center justify-center bg-primary/10 rounded-lg">
                        <PieChart className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xl font-bold text-primary/90 leading-none">
                            {quarter.name}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium mt-1">
                            Quarter Atual
                        </span>
                    </div>
                </div>

                {/* Right Section: Dates */}
                <div className="flex flex-col items-end justify-center text-[10px] font-bold text-primary/80 leading-tight space-y-0.5">
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground/70">INÍCIO:</span>
                        <span>{info.startDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground/70">FIM:</span>
                        <span>{info.endDate}</span>
                    </div>
                </div>
            </div>

            {/* Bottom Section: Progress Bar */}
            <div className="relative w-full mt-1">
                <div className="flex justify-between text-[10px] font-bold text-primary mb-1 uppercase tracking-wide">
                    <span>Progresso</span>
                    <span className="text-primary/70">faltam {info.daysRemaining} dias</span>
                </div>

                {/* Bar Container */}
                <div className="h-5 w-full bg-slate-200/80 rounded-sm relative overflow-visible">
                    {/* Progress Fill with Gradient */}
                    <div
                        className="h-full rounded-l-sm transition-all duration-500"
                        style={{
                            width: `${info.progress}%`,
                            background: `linear-gradient(90deg, #22c55e 0%, #ef4444 100%)`
                        }}
                    />

                    {/* Current Day Marker */}
                    <div
                        className="absolute top-0 -ml-[1px] h-full w-[2px] bg-primary z-10"
                        style={{ left: `${info.progress}%` }}
                    >
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-0.5 flex flex-col items-center">
                            <span className="text-[9px] font-bold text-primary uppercase leading-none bg-background/80 px-1 rounded-sm backdrop-blur-sm">
                                DIA {info.currentDay}
                            </span>
                        </div>
                    </div>
                </div>
                {/* Spacer for the DIA label */}
                <div className="h-4"></div>
            </div>
        </div>
    );
}
