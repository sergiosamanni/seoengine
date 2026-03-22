import React from 'react';
import { CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Palette, Image as ImageIcon } from 'lucide-react';

export const BrandingTab = ({ branding, setBranding }) => {
    const handleChange = (field, value) => {
        setBranding(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Palette className="w-5 h-5 text-indigo-500" />
                    Branding
                </h3>
                <p className="text-sm text-slate-500">Definisci i colori principali e il logo del brand.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Colore Primario (Hex)</Label>
                        <div className="flex gap-2">
                            <Input
                                type="color"
                                className="w-12 h-10 p-1"
                                value={branding.palette_primary || '#4F46E5'}
                                onChange={(e) => handleChange('palette_primary', e.target.value)}
                            />
                            <Input
                                type="text"
                                placeholder="#4F46E5"
                                value={branding.palette_primary || ''}
                                onChange={(e) => handleChange('palette_primary', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Colore Secondario (Hex)</Label>
                        <div className="flex gap-2">
                            <Input
                                type="color"
                                className="w-12 h-10 p-1"
                                value={branding.palette_secondary || '#10B981'}
                                onChange={(e) => handleChange('palette_secondary', e.target.value)}
                            />
                            <Input
                                type="text"
                                placeholder="#10B981"
                                value={branding.palette_secondary || ''}
                                onChange={(e) => handleChange('palette_secondary', e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Logo URL (Opzionale)</Label>
                        <Input
                            placeholder="https://..."
                            value={branding.logo_url || ''}
                            onChange={(e) => handleChange('logo_url', e.target.value)}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
