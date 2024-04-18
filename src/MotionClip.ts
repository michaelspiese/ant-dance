import * as THREE from 'three'
import { StringParser } from './StringParser';
import { Pose } from './Pose'
import { Skeleton } from './Skeleton'

export class MotionClip
{
    private static numLoading = 0;

    public static finishedLoading(): boolean
    {
        return MotionClip.numLoading == 0;
    }
    
    public frames: Pose[];

    constructor()
    {
        this.frames = [];
    }

    loadFromAMC(filename: string, skeleton: Skeleton): void
    {
        console.log('Loading motion data from ' + filename + '...');

        MotionClip.numLoading++;
        const loader = new THREE.FileLoader();
        loader.load(filename, (data: string | ArrayBuffer) => {

            const parser = new StringParser(data as string);

            while(!parser.done())
            {
                // Consume the header
                while(parser.peek().charAt(0) == '#' || parser.peek().charAt(0) == ':')
                {
                    parser.consumeLine();
                }

                while(!parser.done())
                {
                    const pose = new Pose();
                    pose.frame = parser.readNumber();
        
                    // Loop until we encounter the next frame number
                    while(!parser.done() && isNaN(Number(parser.peek())))
                    {
                        const boneName = parser.readToken();
                        if(boneName == 'root')
                        {
                            // Convert from AMC mocap units to meters
                            const rootPosition = new THREE.Vector3();
                            rootPosition.x = parser.readNumber() * 0.056444;
                            rootPosition.y = parser.readNumber() * 0.056444;
                            rootPosition.z = parser.readNumber() * 0.056444;
                            pose.setRootPosition(rootPosition);
  
                            // AMC mocap data uses ZYX transformation order for Euler angles
                            const rootRotation = new THREE.Euler();
                            rootRotation.order = 'ZYX';

                            // Convert from degrees to radians
                            rootRotation.x = parser.readNumber() * Math.PI / 180;
                            rootRotation.y = parser.readNumber() * Math.PI / 180;
                            rootRotation.z = parser.readNumber() * Math.PI / 180;
                            pose.setRootAngles(rootRotation);
                        }
                        else
                        {
                            const bone = skeleton.getBone(boneName);
                            
                            // AMC mocap data uses ZYX transformation order for Euler angles
                            const angles = new THREE.Euler();
                            angles.order = 'ZYX';

                            if(bone.dofs[0])
                                angles.x = parser.readNumber() * Math.PI / 180;

                            if(bone.dofs[1])
                                angles.y = parser.readNumber() * Math.PI / 180;

                            if(bone.dofs[2])
                                angles.z = parser.readNumber() * Math.PI / 180;
 
                            pose.setJointAngles(bone, angles);
                        }
                    }

                    this.frames.push(pose);
                }
            }

            console.log('Motion data loaded from ' + filename + '.');
            MotionClip.numLoading--;
        });
    }

    trimFront(numFrames: number): void
    {
        this.frames.splice(0, numFrames);
    }

    trimBack(numFrames: number): void
    {
        this.frames.splice(this.frames.length-numFrames, numFrames);
    }

    prependPose(pose: Pose): void
    {
        this.frames.unshift(pose);
    }

    appendPose(pose: Pose): void
    {
        this.frames.push(pose);
    }
    
    makeLoop(numBlendFrames: number): void
    {
        const tempClip = new MotionClip();
        for(let i=0; i < numBlendFrames; i++)
        {
            tempClip.prependPose(this.frames.pop()!);
        }

        for(let i=0; i < numBlendFrames; i++)
        {
            const alpha = i / (tempClip.frames.length-1);
            tempClip.frames[i].lerp(this.frames[i], alpha);
            this.frames[i] = tempClip.frames[i];
        }
    }
}