import { ReactNode, useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import {
    LayoutDashboard,
    Building2,
    Users,
    Calendar,
    Target,
    LogOut,
    User,
    TrendingUp,
    PanelLeftClose,
    PanelLeftOpen,
    Eye,
    History,
    Beaker
} from 'lucide-react';
import { cn, toTitleCase } from '@/lib/utils';
import { CompanySelector } from './CompanySelector';
import { EditProfileDialog } from './EditProfileDialog';

interface AppLayoutProps {
    children?: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
    const { signOut, user, refreshProfile } = useAuth();
    const { role } = useUserRole();
    const navigate = useNavigate();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [company, setCompany] = useState<any>(null);
    const [editProfileOpen, setEditProfileOpen] = useState(false);

    useEffect(() => {
        if (user) {
            loadProfile();
        }
    }, [user]);

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
        { icon: Building2, label: 'Empresas', path: '/companies' },
        { icon: Users, label: 'Usuários', path: '/users' },
        { icon: Calendar, label: 'Quarter/Check-ins', path: '/quarters' },
        { icon: Target, label: 'Objetivos', path: '/objectives' },
        { icon: TrendingUp, label: 'Check-ins KR', path: '/kr-checkins' },
        { icon: History, label: 'Histórico', path: '/performance-history' },
        { icon: Eye, label: 'Visão Geral', path: '/overview', adminOnly: true },
        { icon: Beaker, label: 'Laboratório', path: '/prototypes', adminOnly: true },
    ];

    // Filter navigation items based on role
    const filteredNavItems = navItems.filter(item => {
        if (item.adminOnly) {
            return role === 'admin';
        }
        return true;
    });

    return (
        <div className="flex h-screen bg-background">
            {/* Sidebar */}
            <aside className={cn(collapsed ? 'w-16' : 'w-64', 'bg-sidebar border-r border-sidebar-border flex flex-col transition-[width] duration-300')}>
                <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                            <Target className="w-6 h-6 text-white" />
                        </div>
                        {!collapsed && (
                            <div>
                                <h1 className="text-xl font-bold text-sidebar-foreground">Wenkey</h1>
                                <p className="text-xs text-sidebar-foreground/60">{toTitleCase('Gestão de OKRs')}</p>
                            </div>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label={collapsed ? 'Expandir menu' : 'Colapsar menu'}
                            onClick={() => setCollapsed((c) => !c)}
                            className="text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
                        >
                            {collapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
                        </Button>
                    </div>
                </div>

                {/* Company Selector */}
                {!collapsed && (
                    <div className="px-4 pt-4">
                        <CompanySelector />
                    </div>
                )}

                <nav className="flex-1 p-4 space-y-1">
                    {filteredNavItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Button
                                key={item.path}
                                variant="ghost"
                                className={cn(
                                    'w-full',
                                    collapsed ? 'justify-center' : 'justify-start gap-3',
                                    isActive
                                        ? 'bg-sidebar-accent text-sidebar-primary'
                                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
                                )}
                                onClick={() => navigate(item.path)}
                            >
                                <Icon className="w-5 h-5 flex-shrink-0" />
                                {!collapsed && <span className="text-base font-normal">{toTitleCase(item.label)}</span>}
                            </Button>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-sidebar-border space-y-3">
                    {!collapsed && profile && (
                        <div
                            className="flex flex-col items-center space-y-2 py-2 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setEditProfileOpen(true)}
                        >
                            <Avatar className="w-12 h-12">
                                <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                                <AvatarFallback className="bg-primary text-primary-foreground">
                                    {profile.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="text-center space-y-0.5">
                                <p className="text-base font-normal text-sidebar-foreground">{toTitleCase(profile.full_name)}</p>
                                {profile.position && (
                                    <p className="text-sm text-sidebar-foreground/60">{toTitleCase(profile.position)}</p>
                                )}
                                {company && (
                                    <p className="text-sm text-sidebar-foreground/60">{toTitleCase(company.name)}</p>
                                )}
                                <p className="sr-only">Wenkey</p>
                            </div>
                        </div>
                    )}
                    {collapsed && profile && (
                        <div
                            className="flex justify-center cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setEditProfileOpen(true)}
                        >
                            <Avatar className="w-8 h-8">
                                <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                    {profile.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                    )}
                    <Button
                        variant="outline"
                        className={cn(
                            'w-full bg-transparent border-2 border-primary text-sidebar-foreground hover:bg-primary/10 hover:text-sidebar-foreground transition-all rounded-full',
                            collapsed ? 'px-0 justify-center' : 'justify-start gap-3'
                        )}
                        onClick={signOut}
                    >
                        <LogOut className="w-5 h-5" />
                        {!collapsed && <span className="text-base font-normal">{toTitleCase('Sair')}</span>}
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                <div className="p-8">
                    {children ? children : <Outlet />}
                </div>
            </main>

            {/* Edit Profile Dialog */}
            <EditProfileDialog
                open={editProfileOpen}
                onOpenChange={setEditProfileOpen}
                profile={profile}
                onProfileUpdated={async () => {
                    if (user) {
                        await refreshProfile();
                        await loadProfile();
                    }
                }}
            />
        </div>
    );

    async function loadProfile(retryCount = 0) {
        if (!user) return;

        let mounted = true;

        try {
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('full_name, position, avatar_url, company_id')
                .eq('id', user.id)
                .maybeSingle();

            if (profileError) {
                console.error('Layout: Error loading profile:', profileError);
                if (retryCount < 3) {
                    setTimeout(() => loadProfile(retryCount + 1), 1000 * (retryCount + 1));
                    return;
                }
            }

            if (profileData) {
                let avatarUrl = profileData.avatar_url;
                if (avatarUrl && !avatarUrl.startsWith('http')) {
                    const { data } = supabase.storage.from('avatars').getPublicUrl(avatarUrl);
                    avatarUrl = data.publicUrl;
                }
                setProfile({ ...profileData, avatar_url: avatarUrl });

                if (profileData.company_id) {
                    const { data: companyData, error: companyError } = await supabase
                        .from('companies')
                        .select('name')
                        .eq('id', profileData.company_id)
                        .maybeSingle();

                    if (companyError) {
                        console.error('Layout: Error loading company:', companyError);
                    }

                    if (companyData) {
                        setCompany(companyData);
                    }
                }
            }
        } catch (err) {
            console.error('Layout: Unexpected error in loadProfile:', err);
            if (retryCount < 3) {
                setTimeout(() => loadProfile(retryCount + 1), 1000 * (retryCount + 1));
            }
        }
    }
}
