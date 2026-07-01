'use server';

import { createSupabaseAdmin, getAuthUser, createSupabaseServer } from '@/lib/supabase/server';
import sharp from 'sharp';

export async function uploadListCover(listId: string, formData: FormData) {
    try {
        const user = await getAuthUser();
        if (!user) return { ok: false, error: 'Not authenticated' };

        const supabase = await createSupabaseServer();
        const { data: list } = await supabase
            .from('user_lists')
            .select('id')
            .eq('id', listId)
            .eq('user_id', user.id)
            .maybeSingle();
        if (!list) return { ok: false, error: 'Not authorized' };

        const file = formData.get('file') as File | null;
        if (!file) return { ok: false, error: 'No file provided' };

        const MAX_SIZE = 5 * 1024 * 1024;
        const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
        if (!ALLOWED_TYPES.includes(file.type)) {
            return { ok: false, error: 'Format invalide — JPEG, PNG ou WebP uniquement' };
        }
        if (file.size > MAX_SIZE) {
            return { ok: false, error: 'Image trop lourde — max 5 MB' };
        }

        const arrayBuffer = await file.arrayBuffer();
        let jpegBuffer: Buffer;
        try {
            jpegBuffer = await sharp(Buffer.from(arrayBuffer))
                .rotate()
                .resize(600, 600, { fit: 'cover' })
                .jpeg({ quality: 85, mozjpeg: true })
                .toBuffer();
        } catch {
            return { ok: false, error: 'Fichier image invalide' };
        }

        const admin = createSupabaseAdmin();
        const path = `${listId}.jpg`;

        // Delete before re-upload pour forcer un cache miss CDN (même pattern que avatars)
        await admin.storage.from('list-covers').remove([path]);

        const { error: uploadError } = await admin.storage.from('list-covers').upload(path, jpegBuffer, {
            upsert: true,
            contentType: 'image/jpeg',
        });
        if (uploadError) throw uploadError;

        const { data: urlData } = admin.storage.from('list-covers').getPublicUrl(path);
        if (!urlData?.publicUrl) throw new Error('Failed to get public URL');

        const coverUrl = `${urlData.publicUrl}?v=${Date.now()}`;

        const { error: updateError } = await admin
            .from('user_lists')
            .update({ custom_cover_url: coverUrl })
            .eq('id', listId);
        if (updateError) throw updateError;

        return { ok: true, coverUrl };
    } catch (error) {
        console.error('List cover upload error:', error);
        return { ok: false, error: error instanceof Error ? error.message : "Erreur lors de l'upload" };
    }
}

export async function removeListCover(listId: string) {
    try {
        const user = await getAuthUser();
        if (!user) return { ok: false, error: 'Not authenticated' };

        const supabase = await createSupabaseServer();
        const { data: list } = await supabase
            .from('user_lists')
            .select('id')
            .eq('id', listId)
            .eq('user_id', user.id)
            .maybeSingle();
        if (!list) return { ok: false, error: 'Not authorized' };

        const admin = createSupabaseAdmin();
        await admin.storage.from('list-covers').remove([`${listId}.jpg`]);

        const { error: updateError } = await admin
            .from('user_lists')
            .update({ custom_cover_url: null })
            .eq('id', listId);
        if (updateError) throw updateError;

        return { ok: true };
    } catch (error) {
        console.error('List cover remove error:', error);
        return { ok: false, error: 'Erreur lors de la suppression' };
    }
}
